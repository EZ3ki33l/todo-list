import { prisma } from "@repo/db";

import { sendExpoPush } from "./expo-push";

/** Délai sans nouvel article avant envoi d'une notif groupée. */
export const SHOPPING_NOTIFY_BATCH_MS = 45_000;

function formatItemLine(title: string, quantity?: number | null, unit?: string | null): string {
  if (quantity == null) return title;
  const u = unit ? ` ${unit}` : "";
  return `${quantity}${u} ${title}`.trim();
}

export async function getShoppingNotifyRecipients(
  listId: string,
  actorUserId: string,
): Promise<{ listTitle: string; recipientIds: string[] } | null> {
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: {
      title: true,
      ownerId: true,
      members: { select: { userId: true, role: true } },
    },
  });
  if (!list) return null;

  const recipientIds = new Set<string>();

  if (actorUserId === list.ownerId) {
    for (const m of list.members) {
      if (m.role === "membre" && m.userId !== actorUserId) {
        recipientIds.add(m.userId);
      }
    }
  } else if (list.ownerId !== actorUserId) {
    recipientIds.add(list.ownerId);
  }

  if (recipientIds.size === 0) return null;

  return { listTitle: list.title, recipientIds: [...recipientIds] };
}

export async function sendAggregatedShoppingNotification(params: {
  listId: string;
  actorUserId: string;
  itemCount: number;
  lastTitle: string;
  lastQuantity?: number | null;
  lastUnit?: string | null;
}): Promise<void> {
  const targets = await getShoppingNotifyRecipients(params.listId, params.actorUserId);
  if (!targets) return;

  const actor = await prisma.user.findUnique({
    where: { id: params.actorUserId },
    select: { name: true, email: true },
  });
  const actorName = actor?.name ?? actor?.email ?? "Quelqu'un";

  let body: string;
  if (params.itemCount === 1) {
    const line = formatItemLine(params.lastTitle, params.lastQuantity, params.lastUnit);
    body = `${actorName} a ajouté ${line}`;
  } else {
    body = `${actorName} a ajouté ${params.itemCount} articles`;
  }

  const pushTokens = await prisma.pushToken.findMany({
    where: { userId: { in: targets.recipientIds } },
    select: { token: true },
  });
  if (pushTokens.length === 0) return;

  await sendExpoPush(
    pushTokens.map(({ token }) => ({
      to: token,
      title: targets.listTitle,
      body,
      sound: "default" as const,
      data: {
        type: "shopping_items_added",
        listId: params.listId,
        count: params.itemCount,
      },
    })),
  );
}
