import type { SchedulableAction } from "@/lib/day-week-split";
import { startOfDay } from "@/lib/day-week-split";

export function dateKey(date: Date): string {
  return startOfDay(date).toISOString().slice(0, 10);
}

export function sameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

export function addDays(date: Date, days: number): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = startOfDay(date);
  d.setMonth(d.getMonth() + months, 1);
  return d;
}

const WEEKDAY_LABELS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

export function getWeekdayLabels(): string[] {
  return WEEKDAY_LABELS;
}

export type CalendarCell = {
  date: Date;
  inMonth: boolean;
};

/** Grille du mois (6 semaines, semaine commençant le lundi). */
export function getMonthCells(viewMonth: Date): CalendarCell[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startOffset);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    cells.push({ date: startOfDay(date), inMonth: date.getMonth() === month });
  }
  return cells;
}

function dueAtMs(dueAt: Date | string | null): number {
  if (!dueAt) return 0;
  return new Date(dueAt).getTime();
}

function timeStr(time: string | null): string {
  return time ?? "";
}

/** Tâches prévues un jour donné (ponctuelles, hebdo ce jour-là, quotidiennes). */
export function actionOnDay(a: SchedulableAction, day: Date): boolean {
  return hasWeeklyOnDay(a, day) || hasPonctualOnDay(a, day) || a.recurrence === "DAILY";
}

export function hasWeeklyOnDay(a: SchedulableAction, day: Date): boolean {
  return a.recurrence === "WEEKLY" && a.recurrenceDow === day.getDay();
}

export function hasPonctualOnDay(a: SchedulableAction, day: Date): boolean {
  if (a.recurrence !== "NONE" || !a.dueAt) return false;
  const dayStart = startOfDay(day);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const t = dueAtMs(a.dueAt);
  return t >= dayStart.getTime() && t < dayEnd.getTime();
}

export type DayTaskMarkers = {
  hasWeekly: boolean;
  hasPonctual: boolean;
};

export function getDayTaskMarkers(actions: SchedulableAction[], day: Date): DayTaskMarkers {
  let hasWeekly = false;
  let hasPonctual = false;
  for (const a of actions) {
    if (hasWeeklyOnDay(a, day)) hasWeekly = true;
    if (hasPonctualOnDay(a, day)) hasPonctual = true;
    if (hasWeekly && hasPonctual) break;
  }
  return { hasWeekly, hasPonctual };
}

export function getActionsForDay<T extends SchedulableAction>(
  actions: T[],
  day: Date,
  sortMode: "schedule" | "position" = "position",
): T[] {
  const filtered = actions.filter((a) => actionOnDay(a, day));
  if (sortMode === "position") {
    return [...filtered].sort((a, b) => a.position - b.position);
  }
  return [...filtered].sort((a, b) => {
    const ta = a.recurrence === "NONE" ? dueAtMs(a.dueAt) : 0;
    const tb = b.recurrence === "NONE" ? dueAtMs(b.dueAt) : 0;
    if (ta !== tb) return ta - tb;
    return timeStr(a.recurrenceTime).localeCompare(timeStr(b.recurrenceTime));
  });
}

export function formatMonthLabel(date: Date): string {
  const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatSelectedDayLabel(date: Date): string {
  const label = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function defaultAgendaDay(now: Date): Date {
  return addDays(now, 1);
}
