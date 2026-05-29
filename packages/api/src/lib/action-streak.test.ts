import { describe, expect, it } from "vitest";

import { computeStreakOnComplete } from "./action-streak";
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
