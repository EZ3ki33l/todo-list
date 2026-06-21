import { describe, expect, it } from "vitest";

import { computeStreakOnComplete, computeStreakOnUndo, streakPeriodKey } from "../../lib/action-streak";

function day(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`);
}

describe("streakPeriodKey", () => {
  it("retourne une clé de jour pour DAILY", () => {
    expect(streakPeriodKey("DAILY", day("2025-06-10"))).toBe("2025-06-10");
  });

  it("retourne une clé de jour pour WEEKLY", () => {
    expect(streakPeriodKey("WEEKLY", day("2025-06-10"))).toBe("2025-06-10");
  });

  it("retourne null pour NONE", () => {
    expect(streakPeriodKey("NONE", day("2025-06-10"))).toBeNull();
  });
});

describe("computeStreakOnComplete", () => {
  it("commence un nouveau streak à 1 si aucune période précédente", () => {
    const result = computeStreakOnComplete("DAILY", 0, 0, null, day("2025-06-10"));
    expect(result.streakCount).toBe(1);
    expect(result.bestStreak).toBe(1);
    expect(result.lastStreakPeriod).toBe("2025-06-10");
  });

  it("incrémente le streak si la période précédente est consécutive (DAILY)", () => {
    const result = computeStreakOnComplete("DAILY", 3, 3, "2025-06-09", day("2025-06-10"));
    expect(result.streakCount).toBe(4);
    expect(result.bestStreak).toBe(4);
  });

  it("remet à 1 si un jour a été sauté (DAILY)", () => {
    const result = computeStreakOnComplete("DAILY", 3, 5, "2025-06-07", day("2025-06-10"));
    expect(result.streakCount).toBe(1);
    expect(result.bestStreak).toBe(5); // bestStreak préservé
  });

  it("ne touche pas au streak si déjà coché cette période", () => {
    const result = computeStreakOnComplete("DAILY", 2, 2, "2025-06-10", day("2025-06-10"));
    expect(result.streakCount).toBe(2);
  });

  it("incrémente le streak WEEKLY si 7 jours écoulés", () => {
    const result = computeStreakOnComplete("WEEKLY", 1, 1, "2025-06-03", day("2025-06-10"));
    expect(result.streakCount).toBe(2);
  });

  it("remet à 1 si plus de 7 jours écoulés (WEEKLY)", () => {
    const result = computeStreakOnComplete("WEEKLY", 2, 4, "2025-05-20", day("2025-06-10"));
    expect(result.streakCount).toBe(1);
  });

  it("met à jour bestStreak si le nouveau streak le dépasse", () => {
    const result = computeStreakOnComplete("DAILY", 9, 9, "2025-06-09", day("2025-06-10"));
    expect(result.bestStreak).toBe(10);
  });
});

describe("computeStreakOnUndo", () => {
  it("décrémente le streak si on décoche dans la même période", () => {
    const result = computeStreakOnUndo("DAILY", 3, 5, "2025-06-10", day("2025-06-10"));
    expect(result.streakCount).toBe(2);
    expect(result.bestStreak).toBe(5); // bestStreak non touché
  });

  it("met lastStreakPeriod à null si streak tombe à 0", () => {
    const result = computeStreakOnUndo("DAILY", 1, 3, "2025-06-10", day("2025-06-10"));
    expect(result.streakCount).toBe(0);
    expect(result.lastStreakPeriod).toBeNull();
  });

  it("ne change rien si la période précédente est différente", () => {
    const result = computeStreakOnUndo("DAILY", 3, 5, "2025-06-09", day("2025-06-10"));
    expect(result.streakCount).toBe(3);
    expect(result.lastStreakPeriod).toBe("2025-06-09");
  });

  it("ne change rien si lastStreakPeriod est null", () => {
    const result = computeStreakOnUndo("DAILY", 0, 0, null, day("2025-06-10"));
    expect(result.streakCount).toBe(0);
  });

  it("déplace lastStreakPeriod à la veille si streak > 1 (DAILY)", () => {
    const result = computeStreakOnUndo("DAILY", 3, 5, "2025-06-10", day("2025-06-10"));
    expect(result.lastStreakPeriod).toBe("2025-06-09");
  });
});
