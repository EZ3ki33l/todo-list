import { describe, expect, it } from "vitest";

// list-progress importe withEffectiveDone depuis @repo/api
// qui ne contient pas de "server-only" sur ce chemin d'export
import { progressLabel, todoListProgress } from "../list-progress";

type Action = Parameters<typeof todoListProgress>[0][number];

function action(overrides: Partial<Action> = {}): Action {
  return {
    done: false,
    doneAt: null,
    recurrence: "NONE",
    recurrenceDow: null,
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("todoListProgress", () => {
  it("retourne null pour une liste vide", () => {
    expect(todoListProgress([])).toBeNull();
  });

  it("compte les ponctuelles faites", () => {
    const result = todoListProgress([
      action({ done: true }),
      action({ done: false }),
      action({ done: true }),
    ]);
    expect(result).toEqual({ done: 2, total: 3 });
  });

  it("compte une DAILY faite aujourd'hui", () => {
    const doneAt = new Date(); // maintenant = aujourd'hui
    const result = todoListProgress([
      action({ recurrence: "DAILY", done: true, doneAt }),
      action({ recurrence: "DAILY", done: false, doneAt: null }),
    ]);
    expect(result?.done).toBe(1);
    expect(result?.total).toBe(2);
  });

  it("ne compte pas une DAILY faite hier", () => {
    const doneAt = new Date(Date.now() - 86_400_000); // hier
    const result = todoListProgress([
      action({ recurrence: "DAILY", done: true, doneAt }),
    ]);
    expect(result?.done).toBe(0);
    expect(result?.total).toBe(1);
  });

  it("retourne done=0 si aucune est faite", () => {
    const result = todoListProgress([action(), action()]);
    expect(result).toEqual({ done: 0, total: 2 });
  });
});

describe("progressLabel", () => {
  it("retourne 'Aucune action' si null", () => {
    expect(progressLabel(null)).toBe("Aucune action");
  });

  it("retourne '1 / 3 fait' au singulier", () => {
    expect(progressLabel({ done: 1, total: 3 })).toBe("1 / 3 fait");
  });

  it("retourne 'N / M faits' au pluriel si done > 1", () => {
    expect(progressLabel({ done: 2, total: 3 })).toBe("2 / 3 faits");
  });

  it("retourne '0 / 2 fait' pour aucune faite", () => {
    expect(progressLabel({ done: 0, total: 2 })).toBe("0 / 2 fait");
  });
});
