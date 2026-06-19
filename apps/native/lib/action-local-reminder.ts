import * as Notifications from "expo-notifications";

export async function scheduleActionLocalReminder(params: {
  actionId: string;
  title: string;
  remindAt: string | Date;
}): Promise<void> {
  const date = new Date(params.remindAt);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: `action-reminder-${params.actionId}`,
    content: {
      title: "Rappel de tâche",
      body: params.title,
      data: { actionId: params.actionId, type: "action_reminder" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });
}

export async function cancelActionLocalReminder(actionId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`action-reminder-${actionId}`);
}
