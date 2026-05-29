import { describe, expect, it } from "vitest";

import { computeStreakOnComplete, computeStreakOnUndo } from "./action-streak";
import { areAllPonctualDone, isListDayComplete } from "./list-day-completion";

describe("computeStreakOnComplete", () => {
  it("démarre à 1", () => {
    const r = computeStreakOnComplete("DAILY", 0, 0, null, new Date(2026, 4, 29));
    expect(r.streakCount).toBe(1);
  });

  it("incrémente les jours consécutifs", () => {
    const r = computeStreakOnComplete("DAILY", 3, 3, "2026-05-28", new Date(2026, 4, 29));
    expect(r.streakCount).toBe(4);
  });

  it("reset après un trou", () => {
    const r = computeStreakOnComplete("DAILY", 5, 5, "2026-05-27", new Date(2026, 4, 29));
    expect(r.streakCount).toBe(1);
  });
});

describe("computeStreakOnUndo", () => {
  it("décrémente si on décoche le jour même", () => {
    const r = computeStreakOnUndo("DAILY", 4, 4, "2026-05-29", new Date(2026, 4, 29));
    expect(r.streakCount).toBe(3);
    expect(r.lastStreakPeriod).toBe("2026-05-28");
    expect(r.bestStreak).toBe(4);
  });

  it("remet à zéro la première série", () => {
    const r = computeStreakOnUndo("DAILY", 1, 1, "2026-05-29", new Date(2026, 4, 29));
    expect(r.streakCount).toBe(0);
    expect(r.lastStreakPeriod).toBeNull();
  });

  it("ne change rien si la série ne vient pas d'aujourd'hui", () => {
    const r = computeStreakOnUndo("DAILY", 4, 4, "2026-05-28", new Date(2026, 4, 29));
    expect(r.streakCount).toBe(4);
    expect(r.lastStreakPeriod).toBe("2026-05-28");
  });
});

describe("list completion", () => {
  const now = new Date(2026, 4, 29, 10);

  it("clôture seulement si ponctuelles faites", () => {
    expect(
      areAllPonctualDone([
        { recurrence: "NONE", done: true, doneAt: null, recurrenceDow: null },
        { recurrence: "DAILY", done: false, doneAt: null, recurrenceDow: null },
      ]),
    ).toBe(true);
  });

  it("jour complet inclut récurrentes du jour", () => {
    expect(
      isListDayComplete(
        [
          { recurrence: "NONE", done: true, doneAt: now, recurrenceDow: null, dueAt: now },
          {
            recurrence: "DAILY",
            done: true,
            doneAt: now,
            recurrenceDow: null,
            dueAt: null,
          },
        ],
        now,
      ),
    ).toBe(true);
  });
});
