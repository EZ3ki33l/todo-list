import { isEffectivelyDone, startOfLocalDay, type ActionCompletionFields } from "./action-recurrence";

type Recurrence = "NONE" | "DAILY" | "WEEKLY";

export type ActionScheduleFields = ActionCompletionFields & {
  recurrence: Recurrence;
  dueAt: Date | null;
  recurrenceDow: number | null;
};

function todayWindow(now: Date) {
  const todayStart = startOfLocalDay(now);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  return { todayStart, todayEnd };
}

/** Tâches prévues pour aujourd'hui (ponctuelles du jour + récurrentes du jour). */
export function isScheduledToday(action: ActionScheduleFields, now = new Date()): boolean {
  if (action.recurrence === "DAILY") return true;
  if (action.recurrence === "WEEKLY") return action.recurrenceDow === now.getDay();
  if (action.recurrence === "NONE" && action.dueAt) {
    const { todayStart, todayEnd } = todayWindow(now);
    return action.dueAt >= todayStart && action.dueAt < todayEnd;
  }
  return false;
}

export function isDoneForToday(action: ActionScheduleFields, now = new Date()): boolean {
  if (action.recurrence === "NONE") return action.done;
  return isEffectivelyDone(action, now);
}

/** Toutes les tâches du jour (y compris récurrentes) sont faites → alerte quotidienne. */
export function isListDayComplete(actions: ActionScheduleFields[], now = new Date()): boolean {
  const today = actions.filter((a) => isScheduledToday(a, now));
  if (today.length === 0) return false;
  return today.every((a) => isDoneForToday(a, now));
}

/** Toutes les ponctuelles sont faites → clôture de la liste (récurrentes ignorées). */
export function areAllPonctualDone(actions: ActionScheduleFields[]): boolean {
  const ponctual = actions.filter((a) => a.recurrence === "NONE");
  if (ponctual.length === 0) return false;
  return ponctual.every((a) => a.done);
}
