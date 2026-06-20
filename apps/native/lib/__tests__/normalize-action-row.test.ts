import { describe, expect, it } from "vitest";

import { normalizeActionRow, normalizeActionRows } from "../normalize-action-row";

type ActionInput = Parameters<typeof normalizeActionRow>[0];

function action(overrides: Partial<ActionInput> = {}): ActionInput {
  return {
    id: "act1",
    title: "Test",
    recurrence: "NONE",
    done: true,
    doneAt: null,
    recurrenceDow: null,
    recurrenceTime: null,
    position: 0,
    streakCount: null,
    bestStreak: null,
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("normalizeActionRow", () => {
  it("préserve done=true pour une ponctuelle", () => {
    const result = normalizeActionRow(action({ done: true }));
    expect(result.done).toBe(true);
  });

  it("préserve done=false pour une ponctuelle non faite", () => {
    const result = normalizeActionRow(action({ done: false }));
    expect(result.done).toBe(false);
  });

  it("met done=false pour une DAILY faite hier", () => {
    const doneAt = new Date(Date.now() - 86_400_000); // hier
    const result = normalizeActionRow(
      action({ recurrence: "DAILY", done: true, doneAt }),
    );
    expect(result.done).toBe(false);
  });

  it("met done=true pour une DAILY faite aujourd'hui", () => {
    const doneAt = new Date(); // maintenant
    const result = normalizeActionRow(
      action({ recurrence: "DAILY", done: true, doneAt }),
    );
    expect(result.done).toBe(true);
  });

  it("normalise streakCount null à 0", () => {
    const result = normalizeActionRow(action({ streakCount: null }));
    expect(result.streakCount).toBe(0);
  });

  it("normalise bestStreak null à 0", () => {
    const result = normalizeActionRow(action({ bestStreak: null }));
    expect(result.bestStreak).toBe(0);
  });

  it("conserve les valeurs de streak existantes", () => {
    const result = normalizeActionRow(action({ streakCount: 5, bestStreak: 10 }));
    expect(result.streakCount).toBe(5);
    expect(result.bestStreak).toBe(10);
  });

  it("préserve les autres propriétés", () => {
    const result = normalizeActionRow(action({ title: "Ma tâche", position: 3 }));
    expect(result.title).toBe("Ma tâche");
    expect(result.position).toBe(3);
  });
});

describe("normalizeActionRows", () => {
  it("normalise un tableau d'actions", () => {
    const doneAt = new Date();
    const rows = [
      action({ done: true }),
      action({ recurrence: "DAILY", done: true, doneAt }),
    ];
    const result = normalizeActionRows(rows);
    expect(result).toHaveLength(2);
    expect(result[0]?.done).toBe(true);
    expect(result[1]?.done).toBe(true);
  });

  it("retourne un tableau vide pour un input vide", () => {
    expect(normalizeActionRows([])).toEqual([]);
  });
});
