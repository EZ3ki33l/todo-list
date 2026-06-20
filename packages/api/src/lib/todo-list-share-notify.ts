import { notifyListShared } from "./list-share-notify";

/** @deprecated Utiliser notifyListShared({ kind: "TODO", ... }) directement. */
export async function notifyTodoListShared(params: {
  listId: string;
  listTitle: string;
  targetUserId: string;
  sharerUserId: string;
  sharerName: string | null;
}): Promise<void> {
  return notifyListShared({ ...params, kind: "TODO" });
}
