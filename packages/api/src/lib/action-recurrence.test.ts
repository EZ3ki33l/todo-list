import { describe, expect, it } from "vitest";

import { isEffectivelyDone } from "./action-recurrence";

function atLocal(y: number, m: number, d: number, h = 12) {
  return new Date(y, m - 1, d, h, 0, 0, 0);
}

describe("isEffectivelyDone", () => {
  it("ponctuelle reste faite", () => {
    expect(
      isEffectivelyDone(
        { recurrence: "NONE", done: true, doneAt: null, recurrenceDow: null },
        atLocal(2026, 5, 29),
      ),
    ).toBe(true);
  });

  it("quotidienne refaite le lendemain", () => {
    const doneAt = atLocal(2026, 5, 28, 18);
    const now = atLocal(2026, 5, 29, 9);
    expect(
      isEffectivelyDone(
        { recurrence: "DAILY", done: true, doneAt, recurrenceDow: null },
        now,
      ),
    ).toBe(false);
  });

  it("quotidienne faite le même jour", () => {
    const doneAt = atLocal(2026, 5, 29, 8);
    const now = atLocal(2026, 5, 29, 20);
    expect(
      isEffectivelyDone(
        { recurrence: "DAILY", done: true, doneAt, recurrenceDow: null },
        now,
      ),
    ).toBe(true);
  });

  it("hebdo seulement le jour prévu", () => {
    const doneAt = atLocal(2026, 5, 27, 10); // mardi
    const mercredi = atLocal(2026, 5, 28, 10);
    expect(
      isEffectivelyDone(
        { recurrence: "WEEKLY", done: true, doneAt, recurrenceDow: 2 },
        mercredi,
      ),
    ).toBe(false);
  });
});
