import { withEffectiveDone, type ActionCompletionFields } from "@repo/api/lib/action-recurrence";

import type { ActionRow } from "@/lib/day-week-split";

type ActionFromApi = ActionRow & {
  doneAt?: string | Date | null;
  streakCount?: number | null;
  bestStreak?: number | null;
  updatedAt?: string | Date;
};

function asCompletionFields(action: ActionFromApi): ActionCompletionFields {
  return {
    recurrence: action.recurrence as ActionCompletionFields["recurrence"],
    done: action.done,
    doneAt: action.doneAt ? new Date(action.doneAt) : null,
    recurrenceDow: action.recurrenceDow,
    updatedAt: action.updatedAt ? new Date(action.updatedAt) : undefined,
  };
}

/** Normalise streak + état « fait aujourd'hui » (récurrentes). */
export function normalizeActionRow<T extends ActionFromApi>(action: T): T & ActionRow {
  const effectiveDone = withEffectiveDone(asCompletionFields(action)).done;
  return {
    ...action,
    done: effectiveDone,
    streakCount: action.streakCount ?? 0,
    bestStreak: action.bestStreak ?? 0,
  };
}

export function normalizeActionRows<T extends ActionFromApi>(actions: T[]): (T & ActionRow)[] {
  return actions.map(normalizeActionRow);
}

export { asCompletionFields };
