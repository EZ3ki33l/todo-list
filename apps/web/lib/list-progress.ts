import { withEffectiveDone } from "@repo/api";

type TodoActionProgress = {
  done: boolean;
  doneAt: Date | null;
  recurrence: string;
  recurrenceDow: number | null;
  updatedAt: Date;
};

export function todoListProgress(actions: TodoActionProgress[]) {
  const total = actions.length;
  if (total === 0) return null;
  const done = actions.filter((a) =>
    withEffectiveDone({
      ...a,
      recurrence: a.recurrence as "NONE" | "DAILY" | "WEEKLY",
    }).done,
  ).length;
  return { done, total };
}

export function progressLabel(progress: { done: number; total: number } | null) {
  if (!progress) return "Aucune action";
  return `${progress.done} / ${progress.total} fait${progress.done > 1 ? "s" : ""}`;
}
