import { describe, expect, it } from "vitest";

import { progressByListIdFromActions, shoppingCountsByListId } from "../batch-list-stats";

type ActionFields = Parameters<typeof progressByListIdFromActions>[1][number];

function action(overrides: Partial<ActionFields> & { listId: string }): ActionFields {
  return {
    done: false,
    doneAt: null,
    recurrence: "NONE",
    recurrenceDow: null,
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("progressByListIdFromActions", () => {
  it("retourne null pour une liste sans actions", () => {
    const result = progressByListIdFromActions(["list1"], []);
    expect(result.get("list1")).toBeNull();
  });

  it("calcule le progrès par liste", () => {
    const actions: ActionFields[] = [
      action({ listId: "list1", done: true }),
      action({ listId: "list1", done: false }),
      action({ listId: "list2", done: true }),
    ];
    const result = progressByListIdFromActions(["list1", "list2"], actions);
    expect(result.get("list1")).toEqual({ done: 1, total: 2 });
    expect(result.get("list2")).toEqual({ done: 1, total: 1 });
  });

  it("ignore les actions dont la liste n'est pas dans listIds", () => {
    const actions: ActionFields[] = [
      action({ listId: "unknown", done: true }),
    ];
    const result = progressByListIdFromActions(["list1"], actions);
    expect(result.get("list1")).toBeNull();
    expect(result.has("unknown")).toBe(false);
  });
});

describe("shoppingCountsByListId", () => {
  it("retourne des totaux à zéro pour des listes sans articles", () => {
    const result = shoppingCountsByListId(["list1"], []);
    expect(result.get("list1")).toEqual({ total: 0, unchecked: 0 });
  });

  it("agrège correctement les totaux et non-cochés", () => {
    const groups = [
      { listId: "list1", checked: false, _count: { _all: 3 } },
      { listId: "list1", checked: true, _count: { _all: 2 } },
      { listId: "list2", checked: false, _count: { _all: 1 } },
    ];
    const result = shoppingCountsByListId(["list1", "list2"], groups);
    expect(result.get("list1")).toEqual({ total: 5, unchecked: 3 });
    expect(result.get("list2")).toEqual({ total: 1, unchecked: 1 });
  });

  it("ignore les groupes dont la liste n'est pas dans listIds", () => {
    const groups = [{ listId: "unknown", checked: false, _count: { _all: 5 } }];
    const result = shoppingCountsByListId(["list1"], groups);
    expect(result.get("list1")).toEqual({ total: 0, unchecked: 0 });
  });
});
