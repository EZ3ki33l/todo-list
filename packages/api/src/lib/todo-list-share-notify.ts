import { recordActivityEvents } from "./activity-events";

export async function notifyTodoListShared(params: {
  listId: string;
  listTitle: string;
  targetUserId: string;
  sharerUserId: string;
  sharerName: string | null;
}): Promise<void> {
  const who = params.sharerName?.trim() || "Quelqu'un";
  const body = `${who} a partagé la liste « ${params.listTitle} » avec vous.`;

  await recordActivityEvents({
    recipientIds: [params.targetUserId],
    actorUserId: params.sharerUserId,
    type: "TODO_LIST_SHARED",
    listKind: "TODO",
    listId: params.listId,
    listTitle: params.listTitle,
    title: "Liste de tâches partagée",
    body,
  });
}
