import { notifyListShared } from "./list-share-notify";

/** @deprecated Utiliser notifyListShared({ kind: "SHOPPING", ... }) directement. */
export async function notifyShoppingListShared(params: {
  listId: string;
  listTitle: string;
  targetUserId: string;
  sharerUserId: string;
  sharerName: string | null;
}): Promise<void> {
  return notifyListShared({ ...params, kind: "SHOPPING" });
}
