import { describe, expect, it } from "vitest";

import type { SchedulableAction } from "../day-week-split";
import {
  actionOnDay,
  addDays,
  addMonths,
  dateKey,
  defaultAgendaDay,
  formatMonthLabel,
  formatSelectedDayLabel,
  getActionsForDay,
  getDayTaskMarkers,
  getMonthCells,
  getWeekdayLabels,
  hasPonctualOnDay,
  hasWeeklyOnDay,
  sameDay,
  startOfMonth,
} from "../task-agenda";

function action(over: Partial<SchedulableAction> = {}): SchedulableAction {
  return {
    id: "a",
    recurrence: "NONE",
    dueAt: null,
    recurrenceDow: null,
    recurrenceTime: null,
    position: 0,
    ...over,
  };
}

/** 2026-03-12 est un jeudi (dow 4). */
const THURSDAY = new Date(2026, 2, 12, 15, 30);

describe("dates utilitaires", () => {
  it("dateKey normalise au jour", () => {
    expect(dateKey(new Date(2026, 2, 12, 23, 59))).toBe(
      dateKey(new Date(2026, 2, 12, 0, 1)),
    );
  });

  it("sameDay compare au jour près", () => {
    expect(sameDay(THURSDAY, new Date(2026, 2, 12, 1, 0))).toBe(true);
    expect(sameDay(THURSDAY, new Date(2026, 2, 13))).toBe(false);
  });

  it("addDays décale et remet à minuit", () => {
    const d = addDays(THURSDAY, 3);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
  });

  it("startOfMonth et addMonths", () => {
    expect(startOfMonth(THURSDAY).getDate()).toBe(1);
    const next = addMonths(THURSDAY, 1);
    expect(next.getMonth()).toBe(3);
    expect(next.getDate()).toBe(1);
  });

  it("defaultAgendaDay vise le lendemain", () => {
    expect(defaultAgendaDay(THURSDAY).getDate()).toBe(13);
  });
});

describe("getWeekdayLabels / getMonthCells", () => {
  it("commence la semaine le lundi", () => {
    expect(getWeekdayLabels()[0]).toBe("Lu");
  });

  it("produit une grille de 42 jours démarrant un lundi", () => {
    const cells = getMonthCells(new Date(2026, 2, 1));
    expect(cells).toHaveLength(42);
    expect(cells[0]!.date.getDay()).toBe(1);
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31);
  });
});

describe("appartenance d'une action à un jour", () => {
  it("hebdomadaire : uniquement le bon jour de semaine", () => {
    const weekly = action({ recurrence: "WEEKLY", recurrenceDow: 4 });
    expect(hasWeeklyOnDay(weekly, THURSDAY)).toBe(true);
    expect(hasWeeklyOnDay(weekly, addDays(THURSDAY, 1))).toBe(false);
  });

  it("ponctuelle : dans la fenêtre du jour", () => {
    const due = action({ recurrence: "NONE", dueAt: new Date(2026, 2, 12, 9, 0) });
    expect(hasPonctualOnDay(due, THURSDAY)).toBe(true);
    expect(hasPonctualOnDay(due, addDays(THURSDAY, 1))).toBe(false);
    expect(hasPonctualOnDay(action({ recurrence: "NONE" }), THURSDAY)).toBe(false);
    expect(hasPonctualOnDay(action({ recurrence: "DAILY" }), THURSDAY)).toBe(false);
  });

  it("quotidienne : tous les jours", () => {
    expect(actionOnDay(action({ recurrence: "DAILY" }), THURSDAY)).toBe(true);
    expect(actionOnDay(action({ recurrence: "NONE" }), THURSDAY)).toBe(false);
  });
});

describe("getDayTaskMarkers", () => {
  it("signale hebdo et ponctuel", () => {
    const actions = [
      action({ id: "w", recurrence: "WEEKLY", recurrenceDow: 4 }),
      action({ id: "p", recurrence: "NONE", dueAt: new Date(2026, 2, 12, 9, 0) }),
      action({ id: "d", recurrence: "DAILY" }),
    ];
    expect(getDayTaskMarkers(actions, THURSDAY)).toEqual({
      hasWeekly: true,
      hasPonctual: true,
    });
  });

  it("ne signale rien un jour vide", () => {
    expect(getDayTaskMarkers([action({ recurrence: "DAILY" })], THURSDAY)).toEqual({
      hasWeekly: false,
      hasPonctual: false,
    });
  });
});

describe("getActionsForDay", () => {
  const early = action({
    id: "early",
    recurrence: "NONE",
    dueAt: new Date(2026, 2, 12, 8, 0),
    position: 2,
  });
  const late = action({
    id: "late",
    recurrence: "NONE",
    dueAt: new Date(2026, 2, 12, 18, 0),
    position: 1,
  });
  const daily = action({ id: "daily", recurrence: "DAILY", recurrenceTime: "07:00", position: 3 });

  it("trie par position par défaut", () => {
    expect(getActionsForDay([early, late, daily], THURSDAY).map((a) => a.id)).toEqual([
      "late",
      "early",
      "daily",
    ]);
  });

  it("trie par horaire en mode schedule", () => {
    expect(
      getActionsForDay([early, late, daily], THURSDAY, "schedule").map((a) => a.id),
    ).toEqual(["daily", "early", "late"]);
  });

  it("départage deux récurrentes par leur horaire", () => {
    const evening = action({ id: "evening", recurrence: "DAILY", recurrenceTime: "19:00" });
    expect(
      getActionsForDay([evening, daily], THURSDAY, "schedule").map((a) => a.id),
    ).toEqual(["daily", "evening"]);
  });

  it("exclut les actions d'un autre jour", () => {
    expect(getActionsForDay([early, late], addDays(THURSDAY, 1))).toEqual([]);
  });
});

describe("libellés", () => {
  it("met une majuscule au mois et au jour", () => {
    expect(formatMonthLabel(THURSDAY)).toMatch(/^[A-ZÀ-Ý]/);
    expect(formatSelectedDayLabel(THURSDAY)).toMatch(/^[A-ZÀ-Ý]/);
  });
});
