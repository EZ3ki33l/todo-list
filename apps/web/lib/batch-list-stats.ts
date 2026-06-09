import type { Recurrence } from "@repo/db";

import { todoListProgress } from "@/lib/list-progress";

type ActionProgressFields = {
  listId: string;
  done: boolean;
  doneAt: Date | null;
  recurrence: Recurrence;
  recurrenceDow: number | null;
  updatedAt: Date;
};

export function progressByListIdFromActions(
  listIds: string[],
  actions: ActionProgressFields[],
): Map<string, ReturnType<typeof todoListProgress>> {
  const byList = new Map<string, ActionProgressFields[]>();
  for (const id of listIds) byList.set(id, []);
  for (const action of actions) {
    const bucket = byList.get(action.listId);
    if (bucket) bucket.push(action);
  }
  return new Map(
    listIds.map((id) => [id, todoListProgress(byList.get(id) ?? [])]),
  );
}

export function shoppingCountsByListId(
  listIds: string[],
  groups: { listId: string; checked: boolean; _count: { _all: number } }[],
): Map<string, { total: number; unchecked: number }> {
  const map = new Map(listIds.map((id) => [id, { total: 0, unchecked: 0 }]));
  for (const g of groups) {
    const row = map.get(g.listId);
    if (!row) continue;
    row.total += g._count._all;
    if (!g.checked) row.unchecked += g._count._all;
  }
  return map;
}
