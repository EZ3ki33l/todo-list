import { prisma } from "@repo/db";

import { filterRecipientsForNotificationType } from "./notification-preferences";

export type ActivityEventType =
  | "SHOPPING_LIST_SHARED"
  | "SHOPPING_ITEMS_ADDED"
  | "TODO_LIST_SHARED";

export type ActivityListKind = "TODO" | "SHOPPING";

export type RecordActivityParams = {
  recipientIds: string[];
  actorUserId?: string | null;
  type: ActivityEventType;
  listKind?: ActivityListKind | null;
  listId?: string | null;
  listTitle?: string | null;
  title: string;
  body: string;
};

export async function recordActivityEvents(params: RecordActivityParams): Promise<void> {
  const recipientIds = await filterRecipientsForNotificationType(
    params.recipientIds,
    params.type,
  );
  if (recipientIds.length === 0) return;

  await prisma.activityEvent.createMany({
    data: recipientIds.map((userId) => ({
      userId,
      actorUserId: params.actorUserId ?? null,
      type: params.type,
      listKind: params.listKind ?? null,
      listId: params.listId ?? null,
      listTitle: params.listTitle ?? null,
      title: params.title,
      body: params.body,
    })),
  });

  const url =
    params.listId && params.listKind === "SHOPPING"
      ? `/dashboard/shopping/${params.listId}`
      : params.listId && params.listKind === "TODO"
        ? `/dashboard/lists/${params.listId}`
        : "/";

  void import("./web-push")
    .then((m) =>
      m.sendWebPushToUsers(recipientIds, {
        title: params.title,
        body: params.body,
        url,
      }),
    )
    .catch((err) => console.error("[web-push] activity", err));
}
