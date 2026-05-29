import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@repo/api";

export type ActionRow = inferRouterOutputs<AppRouter>["actions"]["getByList"][number];

export type SchedulableAction = {
  id: string;
  recurrence: string;
  dueAt: Date | string | null;
  recurrenceDow: number | null;
  recurrenceTime: string | null;
  position: number;
};

export type DayGroup<T extends { id: string } = SchedulableAction> = {
  key: string;
  date: Date;
  label: string;
  actions: T[];
};

function dueAtMs(dueAt: Date | string | null): number {
  if (!dueAt) return 0;
  return new Date(dueAt).getTime();
}

function timeStr(time: string | null): string {
  return time ?? "";
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export { startOfDay };

export function getScheduleWindow(now = new Date()) {
  const todayStart = startOfDay(now);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const todayDow = now.getDay();

  const weekDays: Date[] = [];
  for (let i = 1; i < 7; i++) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() + i);
    weekDays.push(d);
  }

  return { todayStart, todayEnd, weekEnd, todayDow, weekDays };
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

function actionOnDay(a: SchedulableAction, day: Date): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const dow = day.getDay();

  if (a.recurrence === "NONE" && a.dueAt) {
    const t = dueAtMs(a.dueAt);
    return t >= dayStart.getTime() && t < dayEnd.getTime();
  }
  if (a.recurrence === "WEEKLY" && a.recurrenceDow === dow) return true;
  return false;
}

function sortActionsInDay<T extends SchedulableAction>(
  actions: T[],
  sortMode: "schedule" | "position",
): T[] {
  if (sortMode === "position") {
    return [...actions].sort((a, b) => a.position - b.position);
  }
  return [...actions].sort((a, b) => {
    const ta = a.recurrence === "NONE" ? dueAtMs(a.dueAt) : 0;
    const tb = b.recurrence === "NONE" ? dueAtMs(b.dueAt) : 0;
    if (ta !== tb) return ta - tb;
    return timeStr(a.recurrenceTime).localeCompare(timeStr(b.recurrenceTime));
  });
}

export function buildWeekDayGroups<T extends SchedulableAction>(
  actions: T[],
  now = new Date(),
  sortMode: "schedule" | "position" = "schedule",
): DayGroup<T>[] {
  const { weekDays } = getScheduleWindow(now);
  return buildPeriodDayGroups(actions, weekDays[0] ?? addDays(startOfDay(now), 1), sortMode);
}

export function getPeriodDays(periodStart: Date): Date[] {
  const start = startOfDay(periodStart);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return startOfDay(d);
  });
}

function addDays(date: Date, days: number): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function buildPeriodDayGroups<T extends SchedulableAction>(
  actions: T[],
  periodStart: Date,
  sortMode: "schedule" | "position" = "position",
): DayGroup<T>[] {
  return getPeriodDays(periodStart)
    .map((date) => {
      const dayActions = sortActionsInDay(
        actions.filter((a) => actionOnDay(a, date)),
        sortMode,
      );
      if (dayActions.length === 0) return null;
      const key = date.toISOString().slice(0, 10);
      return { key, date, label: formatDayLabel(date), actions: dayActions };
    })
    .filter((g): g is DayGroup<T> => g !== null);
}

export function buildLaterDayGroups<T extends SchedulableAction>(
  actions: T[],
  now = new Date(),
  sortMode: "schedule" | "position" = "schedule",
): DayGroup<T>[] {
  const { weekEnd } = getScheduleWindow(now);

  const later = actions
    .filter((a) => a.recurrence === "NONE" && a.dueAt && dueAtMs(a.dueAt) >= weekEnd.getTime())
    .sort((a, b) =>
      sortMode === "position"
        ? a.position - b.position
        : dueAtMs(a.dueAt) - dueAtMs(b.dueAt),
    );

  const byDate = new Map<string, T[]>();
  for (const action of later) {
    const key = new Date(action.dueAt!).toISOString().slice(0, 10);
    const list = byDate.get(key) ?? [];
    list.push(action);
    byDate.set(key, list);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, dayActions]) => {
      const date = startOfDay(new Date(key));
      return {
        key,
        date,
        label: formatDayLabel(date),
        actions: sortActionsInDay(dayActions, sortMode),
      };
    });
}

function isTodayAction(a: ActionRow, todayStart: Date, todayEnd: Date, todayDow: number): boolean {
  if (a.recurrence === "DAILY") return true;
  if (a.recurrence === "WEEKLY" && a.recurrenceDow === todayDow) return true;
  if (a.recurrence === "NONE" && a.dueAt) {
    const t = dueAtMs(a.dueAt);
    return t >= todayStart.getTime() && t < todayEnd.getTime();
  }
  return false;
}

function isWeekAction(
  a: ActionRow,
  todayEnd: Date,
  weekEnd: Date,
  todayDow: number,
  weekDows: number[],
): boolean {
  if (a.recurrence === "NONE" && a.dueAt) {
    const t = dueAtMs(a.dueAt);
    return t >= todayEnd.getTime() && t < weekEnd.getTime();
  }
  if (a.recurrence === "WEEKLY" && a.recurrenceDow != null && weekDows.includes(a.recurrenceDow)) {
    return true;
  }
  return false;
}

function sortBySchedule(
  today: ActionRow[],
  week: ActionRow[],
  todayDow: number,
  weekDows: number[],
): { today: ActionRow[]; week: ActionRow[] } {
  const ponctualToday = today
    .filter((a) => a.recurrence === "NONE")
    .sort((a, b) => dueAtMs(a.dueAt) - dueAtMs(b.dueAt));
  const dailyTasks = today
    .filter((a) => a.recurrence === "DAILY")
    .sort((a, b) => timeStr(a.recurrenceTime).localeCompare(timeStr(b.recurrenceTime)));
  const weeklyToday = today
    .filter((a) => a.recurrence === "WEEKLY")
    .sort((a, b) => timeStr(a.recurrenceTime).localeCompare(timeStr(b.recurrenceTime)));

  const ponctualWeek = week
    .filter((a) => a.recurrence === "NONE")
    .sort((a, b) => dueAtMs(a.dueAt) - dueAtMs(b.dueAt));
  const weeklyWeek = week
    .filter((a) => a.recurrence === "WEEKLY")
    .sort(
      (a, b) =>
        (a.recurrenceDow ?? 0) - (b.recurrenceDow ?? 0) ||
        timeStr(a.recurrenceTime).localeCompare(timeStr(b.recurrenceTime)),
    );

  return {
    today: [...ponctualToday, ...dailyTasks, ...weeklyToday],
    week: [...ponctualWeek, ...weeklyWeek],
  };
}

export function formatWeekRangeLabel(now = new Date()): string {
  const { weekDays } = getScheduleWindow(now);
  if (weekDays.length === 0) return "";
  const first = weekDays[0]!;
  const last = weekDays[weekDays.length - 1]!;
  return `du ${formatShortDate(first)} au ${formatShortDate(last)}`;
}

export function splitActionsByDayWeek(
  actions: ActionRow[],
  now = new Date(),
  sortMode: "schedule" | "position" = "schedule",
) {
  const { todayStart, todayEnd, weekEnd, todayDow, weekDays } = getScheduleWindow(now);
  const weekDows = weekDays.map((d) => d.getDay());

  const withDone = [...actions].sort((a, b) => a.position - b.position);
  const globalIds = withDone.map((a) => a.id);

  const todayFiltered = withDone.filter((a) => isTodayAction(a, todayStart, todayEnd, todayDow));
  const weekFiltered = withDone.filter((a) =>
    isWeekAction(a, todayEnd, weekEnd, todayDow, weekDows),
  );

  const weekDayGroups = buildWeekDayGroups(withDone, now, sortMode);
  const laterDayGroups = buildLaterDayGroups(withDone, now, sortMode);
  const laterCount = laterDayGroups.reduce((n, g) => n + g.actions.length, 0);

  if (sortMode === "position") {
    return {
      today: todayFiltered,
      week: weekFiltered,
      weekDayGroups,
      laterDayGroups,
      laterCount,
      globalIds,
      todayEnd,
      todayStart,
      weekEnd,
    };
  }

  const sorted = sortBySchedule(todayFiltered, weekFiltered, todayDow, weekDows);
  return {
    ...sorted,
    weekDayGroups,
    laterDayGroups,
    laterCount,
    globalIds,
    todayEnd,
    todayStart,
    weekEnd,
  };
}

/** Réordonne une section dans l'ordre global de la liste. */
export function reorderSectionInGlobal(
  globalIds: string[],
  sectionIds: string[],
  fromId: string,
  toId: string,
): string[] {
  if (fromId === toId) return globalIds;

  const section = [...sectionIds];
  const fromIdx = section.indexOf(fromId);
  const toIdx = section.indexOf(toId);
  if (fromIdx < 0 || toIdx < 0) return globalIds;

  const [moved] = section.splice(fromIdx, 1);
  section.splice(toIdx, 0, moved);

  const sectionSet = new Set(sectionIds);
  const out: string[] = [];
  let inserted = false;

  for (const id of globalIds) {
    if (sectionSet.has(id)) {
      if (!inserted) {
        out.push(...section);
        inserted = true;
      }
    } else {
      out.push(id);
    }
  }

  return out;
}

export function moveInList<T extends { id: string }>(list: T[], fromId: string, toId: string): T[] {
  if (fromId === toId) return list;
  const next = [...list];
  const fromIdx = next.findIndex((i) => i.id === fromId);
  const toIdx = next.findIndex((i) => i.id === toId);
  if (fromIdx < 0 || toIdx < 0) return next;
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
}
