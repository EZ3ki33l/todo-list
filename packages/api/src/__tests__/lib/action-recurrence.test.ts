import { describe, expect, it } from "vitest";

import {
  getCompletionAt,
  isEffectivelyDone,
  startOfLocalDay,
  withEffectiveDone,
} from "../../lib/action-recurrence";

function now() {
  return new Date("2025-06-10T12:00:00");
}

function todayStart() {
  const d = new Date("2025-06-10T00:00:00");
  return d;
}

const TUESDAY = 2; // 2025-06-10 est un mardi

describe("startOfLocalDay", () => {
  it("retourne minuit du même jour", () => {
    const d = startOfLocalDay(new Date("2025-06-10T14:30:00"));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getDate()).toBe(10);
  });
});

describe("getCompletionAt", () => {
  it("retourne null si non fait", () => {
    expect(
      getCompletionAt({ recurrence: "NONE", done: false, doneAt: null, recurrenceDow: null }),
    ).toBeNull();
  });

  it("retourne doneAt en priorité", () => {
    const doneAt = new Date("2025-06-10T09:00:00");
    expect(
      getCompletionAt({ recurrence: "NONE", done: true, doneAt, recurrenceDow: null }),
    ).toBe(doneAt);
  });

  it("retourne updatedAt pour les récurrentes sans doneAt", () => {
    const updatedAt = new Date("2025-06-10T08:00:00");
    expect(
      getCompletionAt({
        recurrence: "DAILY",
        done: true,
        doneAt: null,
        recurrenceDow: null,
        updatedAt,
      }),
    ).toBe(updatedAt);
  });

  it("retourne null pour ponctuelle faite sans doneAt ni updatedAt", () => {
    expect(
      getCompletionAt({ recurrence: "NONE", done: true, doneAt: null, recurrenceDow: null }),
    ).toBeNull();
  });
});

describe("isEffectivelyDone", () => {
  it("NONE done=false → false", () => {
    expect(
      isEffectivelyDone({ recurrence: "NONE", done: false, doneAt: null, recurrenceDow: null }, now()),
    ).toBe(false);
  });

  it("NONE done=true → true (permanente)", () => {
    expect(
      isEffectivelyDone({ recurrence: "NONE", done: true, doneAt: null, recurrenceDow: null }, now()),
    ).toBe(true);
  });

  it("DAILY faite aujourd'hui → true", () => {
    expect(
      isEffectivelyDone(
        { recurrence: "DAILY", done: true, doneAt: new Date("2025-06-10T09:00:00"), recurrenceDow: null },
        now(),
      ),
    ).toBe(true);
  });

  it("DAILY faite hier → false", () => {
    expect(
      isEffectivelyDone(
        { recurrence: "DAILY", done: true, doneAt: new Date("2025-06-09T22:00:00"), recurrenceDow: null },
        now(),
      ),
    ).toBe(false);
  });

  it("WEEKLY bon jour faite aujourd'hui → true", () => {
    expect(
      isEffectivelyDone(
        {
          recurrence: "WEEKLY",
          done: true,
          doneAt: new Date("2025-06-10T09:00:00"),
          recurrenceDow: TUESDAY,
        },
        now(),
      ),
    ).toBe(true);
  });

  it("WEEKLY mauvais jour → false", () => {
    expect(
      isEffectivelyDone(
        {
          recurrence: "WEEKLY",
          done: true,
          doneAt: new Date("2025-06-10T09:00:00"),
          recurrenceDow: 1, // lundi, on est mardi
        },
        now(),
      ),
    ).toBe(false);
  });

  it("DAILY sans completedAt → false", () => {
    expect(
      isEffectivelyDone(
        { recurrence: "DAILY", done: true, doneAt: null, recurrenceDow: null },
        now(),
      ),
    ).toBe(false);
  });
});

describe("withEffectiveDone", () => {
  it("retourne l'action avec done recalculé", () => {
    const action = {
      recurrence: "DAILY" as const,
      done: true,
      doneAt: new Date("2025-06-09T20:00:00"), // hier
      recurrenceDow: null,
      title: "Sport",
    };
    const result = withEffectiveDone(action, now());
    expect(result.done).toBe(false);
    expect(result.title).toBe("Sport"); // autres propriétés préservées
  });
});
