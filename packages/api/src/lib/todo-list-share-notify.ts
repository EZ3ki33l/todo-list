import { prisma } from "@repo/db";

import { recordActivityEvents } from "./activity-events";
import { filterRecipientsForNotificationType } from "./notification-preferences";
import { sendExpoPush } from "./expo-push";

/** Prévient l'invité qu'une liste de tâches lui a été partagée. */
export async function notifyTodoListShared(params: {
  listId: string;
  listTitle: string;
  targetUserId: string;
  sharerUserId: string;
  sharerName: string | null;
}): Promise<void> {
  const who = params.sharerName?.trim() || "Quelqu'un";
  const body = `${who} a partagé la liste « ${params.listTitle} » avec vous.`;
  const title = "Liste de tâches partagée";

  await recordActivityEvents({
    recipientIds: [params.targetUserId],
    actorUserId: params.sharerUserId,
    type: "TODO_LIST_SHARED",
    listKind: "TODO",
    listId: params.listId,
    listTitle: params.listTitle,
    title,
    body,
  });

  const pushRecipientIds = await filterRecipientsForNotificationType(
    [params.targetUserId],
    "TODO_LIST_SHARED",
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
      body: `${body} Ouvrez l'onglet Tâches.`,
      data: { listId: params.listId, type: "todo_list_shared" },
      sound: "default",
    })),
  );
}
