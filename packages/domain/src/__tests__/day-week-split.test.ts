import { describe, expect, it } from "vitest";

import {
  getUnscheduledActions,
  moveInList,
  reorderSectionInGlobal,
  splitActionsByDayWeek,
  startOfDay,
  type SchedulableAction,
} from "../day-week-split";

// Mercredi 10 janvier 2024, 15h30 — fixe pour des tests déterministes.
const NOW = new Date(2024, 0, 10, 15, 30);

function action(overrides: Partial<SchedulableAction> & { id: string }): SchedulableAction {
  return {
    recurrence: "NONE",
    dueAt: null,
    recurrenceDow: null,
    recurrenceTime: null,
    position: 0,
    ...overrides,
  };
}

describe("startOfDay", () => {
  it("met l'heure à minuit sans changer le jour", () => {
    const d = startOfDay(new Date(2024, 0, 10, 23, 59, 59));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getDate()).toBe(10);
  });
});

describe("getUnscheduledActions", () => {
  it("ne garde que les tâches ponctuelles sans échéance", () => {
    const actions = [
      action({ id: "a", recurrence: "NONE", dueAt: null }),
      action({ id: "b", recurrence: "NONE", dueAt: new Date(2024, 0, 10) }),
      action({ id: "c", recurrence: "DAILY" }),
    ];
    expect(getUnscheduledActions(actions).map((a) => a.id)).toEqual(["a"]);
  });
});

describe("splitActionsByDayWeek", () => {
  it("classe une tâche DAILY et une tâche due aujourd'hui dans 'today'", () => {
    const daily = action({ id: "daily", recurrence: "DAILY" });
    const dueToday = action({ id: "due-today", recurrence: "NONE", dueAt: new Date(2024, 0, 10, 9) });
    const result = splitActionsByDayWeek([daily, dueToday], NOW);
    expect(result.today.map((a) => a.id).sort()).toEqual(["daily", "due-today"]);
  });

  it("classe une tâche WEEKLY correspondant au jour de la semaine dans 'today'", () => {
    const weeklyToday = action({ id: "weekly-today", recurrence: "WEEKLY", recurrenceDow: NOW.getDay() });
    const weeklyOtherDay = action({
      id: "weekly-other",
      recurrence: "WEEKLY",
      recurrenceDow: (NOW.getDay() + 2) % 7,
    });
    const result = splitActionsByDayWeek([weeklyToday, weeklyOtherDay], NOW);
    expect(result.today.map((a) => a.id)).toEqual(["weekly-today"]);
    expect(result.week.map((a) => a.id)).toEqual(["weekly-other"]);
  });

  it("classe une tâche ponctuelle due plus tard cette semaine dans 'week', et au-delà dans laterDayGroups", () => {
    const inThreeDays = new Date(2024, 0, 13, 9); // dans la fenêtre des 7 jours
    const inTenDays = new Date(2024, 0, 20, 9); // hors fenêtre
    const soon = action({ id: "soon", recurrence: "NONE", dueAt: inThreeDays });
    const later = action({ id: "later", recurrence: "NONE", dueAt: inTenDays });
    const result = splitActionsByDayWeek([soon, later], NOW);
    expect(result.week.map((a) => a.id)).toEqual(["soon"]);
    expect(result.today).toEqual([]);
    const laterIds = result.laterDayGroups.flatMap((g) => g.actions.map((a) => a.id));
    expect(laterIds).toEqual(["later"]);
    expect(result.laterCount).toBe(1);
  });

  it("préserve l'ordre par position en sortMode 'position'", () => {
    const a = action({ id: "a", recurrence: "DAILY", position: 2 });
    const b = action({ id: "b", recurrence: "DAILY", position: 1 });
    const result = splitActionsByDayWeek([a, b], NOW, "position");
    expect(result.globalIds).toEqual(["b", "a"]);
  });
});

describe("reorderSectionInGlobal", () => {
  it("déplace un élément dans sa section sans toucher aux autres", () => {
    const globalIds = ["x", "a", "b", "c", "y"];
    const result = reorderSectionInGlobal(globalIds, ["a", "b", "c"], "c", "a");
    expect(result).toEqual(["x", "c", "a", "b", "y"]);
  });

  it("ne change rien si fromId et toId sont identiques", () => {
    const globalIds = ["a", "b", "c"];
    expect(reorderSectionInGlobal(globalIds, ["a", "b"], "a", "a")).toBe(globalIds);
  });

  it("ignore les IDs absents de la section", () => {
    const globalIds = ["a", "b", "c"];
    expect(reorderSectionInGlobal(globalIds, ["a", "b"], "a", "z")).toBe(globalIds);
  });
});

describe("moveInList", () => {
  it("déplace un élément à la position d'un autre", () => {
    const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(moveInList(list, "a", "c").map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("ne change rien si l'un des IDs est introuvable", () => {
    const list = [{ id: "a" }, { id: "b" }];
    expect(moveInList(list, "a", "z")).toEqual(list);
  });
});
