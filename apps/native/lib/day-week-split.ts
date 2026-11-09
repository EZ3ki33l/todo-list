import type { SchedulableAction } from "@repo/domain/day-week-split";

export * from "@repo/domain/day-week-split";

export type ActionRow = SchedulableAction & {
  title: string;
  done: boolean;
  streakCount: number;
  bestStreak: number;
  locationLabel?: string | null;
  locationAddress?: string | null;
  notes?: string | null;
};
