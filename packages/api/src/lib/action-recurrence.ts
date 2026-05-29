type Recurrence = "NONE" | "DAILY" | "WEEKLY";

export type ActionCompletionFields = {
  recurrence: Recurrence;
  done: boolean;
  doneAt: Date | null;
  recurrenceDow: number | null;
  updatedAt?: Date;
};

export function startOfLocalDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Date/heure de la dernière validation (rétrocompat sans doneAt). */
export function getCompletionAt(action: ActionCompletionFields): Date | null {
  if (!action.done) return null;
  if (action.doneAt) return action.doneAt;
  if (action.recurrence !== "NONE" && action.updatedAt) return action.updatedAt;
  return null;
}

/** Une tâche récurrente n'est « faite » que pour la période en cours (jour / occurrence). */
export function isEffectivelyDone(
  action: ActionCompletionFields,
  now = new Date(),
): boolean {
  if (!action.done) return false;
  if (action.recurrence === "NONE") return true;

  const completedAt = getCompletionAt(action);
  if (!completedAt) return false;

  const todayStart = startOfLocalDay(now);

  if (action.recurrence === "DAILY") {
    return completedAt >= todayStart;
  }

  if (action.recurrence === "WEEKLY") {
    if (action.recurrenceDow !== now.getDay()) return false;
    return completedAt >= todayStart;
  }

  return action.done;
}

export function withEffectiveDone<T extends ActionCompletionFields>(
  action: T,
  now = new Date(),
): T {
  return { ...action, done: isEffectivelyDone(action, now) };
}
