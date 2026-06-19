import { prisma } from "@repo/db";

import { sendExpoPush } from "./expo-push";
import { sendWebPushToUsers } from "./web-push";

export function computeRemindAt(dueAt: Date, remindBeforeMinutes: number): Date | null {
  const sendAt = new Date(dueAt.getTime() - remindBeforeMinutes * 60_000);
  if (sendAt.getTime() <= Date.now()) return null;
  return sendAt;
}

export async function sendActionReminderNotification(
  userId: string,
  action: { id: string; title: string; listId: string },
): Promise<void> {
  const prefs = await prisma.notificationPreferences.findUnique({
    where: { userId },
    select: { alertsEnabled: true },
  });
  if (prefs && !prefs.alertsEnabled) return;

  const body = action.title;
  const title = "Rappel de tâche";
  const url = `/dashboard/lists/${action.listId}`;

  await sendWebPushToUsers([userId], { title, body, url });

  const pushTokens = await prisma.pushToken.findMany({
    where: { userId },
    select: { token: true },
  });
  if (pushTokens.length > 0) {
    await sendExpoPush(
      pushTokens.map(({ token }) => ({
        to: token,
        title,
        body,
        sound: "default" as const,
        data: { type: "action_reminder", actionId: action.id, listId: action.listId },
      })),
    );
  }
}

export async function flushDueActionReminders(): Promise<void> {
  const due = await prisma.action.findMany({
    where: {
      remindAt: { lte: new Date() },
      remindSentAt: null,
      done: false,
    },
    select: {
      id: true,
      title: true,
      listId: true,
      list: { select: { ownerId: true } },
    },
    take: 50,
  });

  for (const action of due) {
    await sendActionReminderNotification(action.list.ownerId, {
      id: action.id,
      title: action.title,
      listId: action.listId,
    });
    await prisma.action.update({
      where: { id: action.id },
      data: { remindSentAt: new Date() },
    });
  }
}
