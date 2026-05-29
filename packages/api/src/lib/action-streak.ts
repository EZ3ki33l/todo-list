type Recurrence = "NONE" | "DAILY" | "WEEKLY";

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

function daysBetween(a: string, b: string): number {
  const ms = parseDayKey(b).getTime() - parseDayKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function streakPeriodKey(recurrence: Recurrence, date: Date): string | null {
  if (recurrence === "DAILY") return dayKey(date);
  if (recurrence === "WEEKLY") return dayKey(date);
  return null;
}

export function computeStreakOnComplete(
  recurrence: "DAILY" | "WEEKLY",
  streakCount: number,
  bestStreak: number,
  lastStreakPeriod: string | null,
  now: Date,
): { streakCount: number; bestStreak: number; lastStreakPeriod: string } {
  const currentKey = streakPeriodKey(recurrence, now)!;

  if (lastStreakPeriod === currentKey) {
    return { streakCount, bestStreak, lastStreakPeriod: currentKey };
  }

  let next = 1;
  if (lastStreakPeriod) {
    const gap = daysBetween(lastStreakPeriod, currentKey);
    const expected = recurrence === "DAILY" ? 1 : 7;
    if (gap === expected) next = streakCount + 1;
  }

  return {
    streakCount: next,
    bestStreak: Math.max(bestStreak, next),
    lastStreakPeriod: currentKey,
  };
}
