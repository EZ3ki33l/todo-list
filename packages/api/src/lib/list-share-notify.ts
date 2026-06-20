import { prisma } from "@repo/db";

import { recordActivityEvents } from "./activity-events";
import { filterRecipientsForNotificationType } from "./notification-preferences";
import { sendExpoPush } from "./expo-push";
import type { ActivityEventType } from "./notification-preference-constants";

type ListKind = "TODO" | "SHOPPING";

type NotifyListSharedParams = {
  listId: string;
  listTitle: string;
  targetUserId: string;
  sharerUserId: string;
  sharerName: string | null;
  kind: ListKind;
};

const KIND_META: Record<
  ListKind,
  { eventType: ActivityEventType; pushTitle: string; tabLabel: string; dataType: string }
> = {
  TODO: {
    eventType: "TODO_LIST_SHARED",
    pushTitle: "Liste de tâches partagée",
    tabLabel: "Tâches",
    dataType: "todo_list_shared",
  },
  SHOPPING: {
    eventType: "SHOPPING_LIST_SHARED",
    pushTitle: "Liste de courses partagée",
    tabLabel: "Courses",
    dataType: "list_shared",
  },
};

/** Notifie un utilisateur qu'une liste (tâches ou courses) lui a été partagée. */
export async function notifyListShared({
  listId,
  listTitle,
  targetUserId,
  sharerUserId,
  sharerName,
  kind,
}: NotifyListSharedParams): Promise<void> {
  const { eventType, pushTitle, tabLabel, dataType } = KIND_META[kind];
  const who = sharerName?.trim() || "Quelqu'un";
  const body = `${who} a partagé la liste « ${listTitle} » avec vous.`;

  await recordActivityEvents({
    recipientIds: [targetUserId],
    actorUserId: sharerUserId,
    type: eventType,
    listKind: kind,
    listId,
    listTitle,
    title: pushTitle,
    body,
  });

  const pushRecipientIds = await filterRecipientsForNotificationType([targetUserId], eventType);
  if (pushRecipientIds.length === 0) return;

  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: pushRecipientIds } },
    select: { token: true },
  });
  if (tokens.length === 0) return;

  await sendExpoPush(
    tokens.map((t) => ({
      to: t.token,
      title: pushTitle,
      body: `${body} Ouvrez l'onglet ${tabLabel}.`,
      data: { listId, type: dataType },
      sound: "default",
    })),
  );
}
