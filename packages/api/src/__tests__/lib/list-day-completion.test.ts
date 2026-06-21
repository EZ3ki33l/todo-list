import { describe, expect, it } from "vitest";

import {
  areAllPonctualDone,
  isDoneForToday,
  isListDayComplete,
  isScheduledToday,
} from "../../lib/list-day-completion";

const TUESDAY_DATE = new Date("2025-06-10T12:00:00"); // mardi (getDay() === 2)

function action(
  overrides: Partial<{
    recurrence: "NONE" | "DAILY" | "WEEKLY";
    done: boolean;
    doneAt: Date | null;
    dueAt: Date | null;
    recurrenceDow: number | null;
    updatedAt: Date;
  }> = {},
) {
  return {
    id: "act1",
    recurrence: "NONE" as const,
    done: false,
    doneAt: null,
    dueAt: null,
    recurrenceDow: null,
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("isScheduledToday", () => {
  it("DAILY toujours vrai", () => {
    expect(isScheduledToday(action({ recurrence: "DAILY" }), TUESDAY_DATE)).toBe(true);
  });

  it("WEEKLY vrai si recurrenceDow correspond au jour actuel", () => {
    expect(
      isScheduledToday(action({ recurrence: "WEEKLY", recurrenceDow: 2 }), TUESDAY_DATE),
    ).toBe(true);
  });

  it("WEEKLY faux si recurrenceDow ne correspond pas", () => {
    expect(
      isScheduledToday(action({ recurrence: "WEEKLY", recurrenceDow: 1 }), TUESDAY_DATE),
    ).toBe(false);
  });

  it("NONE vrai si dueAt est aujourd'hui", () => {
    const dueAt = new Date("2025-06-10T09:00:00");
    expect(isScheduledToday(action({ recurrence: "NONE", dueAt }), TUESDAY_DATE)).toBe(true);
  });

  it("NONE faux si dueAt est demain", () => {
    const dueAt = new Date("2025-06-11T09:00:00");
    expect(isScheduledToday(action({ recurrence: "NONE", dueAt }), TUESDAY_DATE)).toBe(false);
  });

  it("NONE sans dueAt → faux", () => {
    expect(isScheduledToday(action({ recurrence: "NONE", dueAt: null }), TUESDAY_DATE)).toBe(false);
  });
});

describe("isDoneForToday", () => {
  it("NONE done → true", () => {
    expect(isDoneForToday(action({ recurrence: "NONE", done: true }), TUESDAY_DATE)).toBe(true);
  });

  it("NONE not done → false", () => {
    expect(isDoneForToday(action({ recurrence: "NONE", done: false }), TUESDAY_DATE)).toBe(false);
  });

  it("DAILY faite aujourd'hui → true", () => {
    const doneAt = new Date("2025-06-10T08:00:00");
    expect(
      isDoneForToday(action({ recurrence: "DAILY", done: true, doneAt }), TUESDAY_DATE),
    ).toBe(true);
  });

  it("DAILY faite hier → false", () => {
    const doneAt = new Date("2025-06-09T22:00:00");
    expect(
      isDoneForToday(action({ recurrence: "DAILY", done: true, doneAt }), TUESDAY_DATE),
    ).toBe(false);
  });
});

describe("isListDayComplete", () => {
  it("retourne false si aucune tâche du jour", () => {
    expect(isListDayComplete([], TUESDAY_DATE)).toBe(false);
  });

  it("retourne true si toutes les tâches du jour sont faites", () => {
    const actions = [
      action({ recurrence: "DAILY", done: true, doneAt: new Date("2025-06-10T08:00:00") }),
      action({ recurrence: "DAILY", done: true, doneAt: new Date("2025-06-10T09:00:00") }),
    ];
    expect(isListDayComplete(actions, TUESDAY_DATE)).toBe(true);
  });

  it("retourne false si une tâche du jour n'est pas faite", () => {
    const actions = [
      action({ recurrence: "DAILY", done: true, doneAt: new Date("2025-06-10T08:00:00") }),
      action({ recurrence: "DAILY", done: false, doneAt: null }),
    ];
    expect(isListDayComplete(actions, TUESDAY_DATE)).toBe(false);
  });

  it("ignore les tâches sans dueAt non récurrentes", () => {
    const actions = [
      action({ recurrence: "DAILY", done: true, doneAt: new Date("2025-06-10T08:00:00") }),
      action({ recurrence: "NONE", dueAt: null, done: false }), // non prévue aujourd'hui
    ];
    expect(isListDayComplete(actions, TUESDAY_DATE)).toBe(true);
  });
});

describe("areAllPonctualDone", () => {
  it("retourne false si aucune tâche ponctuelle", () => {
    expect(areAllPonctualDone([action({ recurrence: "DAILY" })])).toBe(false);
  });

  it("retourne true si toutes les ponctuelles sont faites", () => {
    expect(
      areAllPonctualDone([
        action({ recurrence: "NONE", done: true }),
        action({ recurrence: "NONE", done: true }),
      ]),
    ).toBe(true);
  });

  it("retourne false si une ponctuelle n'est pas faite", () => {
    expect(
      areAllPonctualDone([
        action({ recurrence: "NONE", done: true }),
        action({ recurrence: "NONE", done: false }),
      ]),
    ).toBe(false);
  });
});
