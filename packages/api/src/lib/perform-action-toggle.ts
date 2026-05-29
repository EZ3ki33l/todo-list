import { prisma } from "@repo/db";

import { isEffectivelyDone, withEffectiveDone } from "./action-recurrence";
import { computeStreakOnComplete, computeStreakOnUndo } from "./action-streak";
import { evaluateListAfterToggle } from "./action-toggle-effects";

export type ToggleActionResult = {
  action: ReturnType<typeof withEffectiveDone>;
  listId: string;
  streakCount: number | null;
  listDayComplete: boolean;
  listClosed: boolean;
};

export async function performActionToggle(
  actionId: string,
  userId: string,
): Promise<ToggleActionResult> {
  const action = await prisma.action.findUnique({
    where: { id: actionId },
    include: { list: { include: { members: { where: { userId } } } } },
  });
  if (!action) throw new Error("Action introuvable");

  const isOwner = action.list.ownerId === userId;
  const member = action.list.members[0];
  if (!isOwner && member?.role !== "membre") {
    throw new Error("Accès refusé");
  }

  const now = new Date();
  const effectivelyDone = isEffectivelyDone(action, now);
  const completing = !effectivelyDone;

  let streakCount = action.streakCount ?? 0;
  let bestStreak = action.bestStreak ?? 0;
  let lastStreakPeriod = action.lastStreakPeriod;

  if (completing && action.recurrence !== "NONE") {
    const streak = computeStreakOnComplete(
      action.recurrence,
      streakCount,
      bestStreak,
      lastStreakPeriod,
      now,
    );
    streakCount = streak.streakCount;
    bestStreak = streak.bestStreak;
    lastStreakPeriod = streak.lastStreakPeriod;
  } else if (!completing && effectivelyDone && action.recurrence !== "NONE") {
    const streak = computeStreakOnUndo(
      action.recurrence,
      streakCount,
      bestStreak,
      lastStreakPeriod,
      now,
    );
    streakCount = streak.streakCount;
    bestStreak = streak.bestStreak;
    lastStreakPeriod = streak.lastStreakPeriod;
  }

  const updated = await prisma.action.update({
    where: { id: actionId },
    data: completing
      ? action.recurrence !== "NONE"
        ? {
            done: true,
            doneAt: now,
            streakCount,
            bestStreak,
            lastStreakPeriod,
          }
        : { done: true, doneAt: now }
      : action.recurrence !== "NONE"
        ? { done: false, doneAt: null, streakCount, bestStreak, lastStreakPeriod }
        : { done: false, doneAt: null },
  });

  const sideEffects = completing
    ? await evaluateListAfterToggle(action.listId, userId, now)
    : { listDayComplete: false, listClosed: false };

  return {
    action: withEffectiveDone(updated, now),
    listId: action.listId,
    streakCount: action.recurrence !== "NONE" ? streakCount : null,
    ...sideEffects,
  };
}
