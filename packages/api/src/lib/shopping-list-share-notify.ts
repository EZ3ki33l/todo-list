import { prisma } from "@repo/db";

import { recordActivityEvents } from "./activity-events";
import { filterRecipientsForNotificationType } from "./notification-preferences";
import { sendExpoPush } from "./expo-push";

/** Prévient l'invité qu'une liste lui a été partagée (pas d'écran « accepter »). */
export async function notifyShoppingListShared(params: {
  listId: string;
  listTitle: string;
  targetUserId: string;
  sharerUserId: string;
  sharerName: string | null;
}): Promise<void> {
  const who = params.sharerName?.trim() || "Quelqu'un";
  const body = `${who} a partagé la liste « ${params.listTitle} » avec vous.`;
  const title = "Liste de courses partagée";

  await recordActivityEvents({
    recipientIds: [params.targetUserId],
    actorUserId: params.sharerUserId,
    type: "SHOPPING_LIST_SHARED",
    listKind: "SHOPPING",
    listId: params.listId,
    listTitle: params.listTitle,
    title,
    body,
  });

  const pushRecipientIds = await filterRecipientsForNotificationType(
    [params.targetUserId],
    "SHOPPING_LIST_SHARED",
  );
  if (pushRecipientIds.length === 0) return;

  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: pushRecipientIds } },
    select: { token: true },
  });
  if (tokens.length === 0) return;

  await sendExpoPush(
    tokens.map((t) => ({
      to: t.token,
      title,
      body: `${body} Ouvrez l'onglet Courses.`,
      data: { listId: params.listId, type: "list_shared" },
      sound: "default",
    })),
  );
}
