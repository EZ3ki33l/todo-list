import { prisma } from "@repo/db";

import type { ActivityEventType } from "./activity-events";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isNotificationTypeEnabled,
  type NotificationPreferencesData,
} from "./notification-preference-constants";

export type { NotificationPreferencesData } from "./notification-preference-constants";
export {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_TYPE_OPTIONS,
} from "./notification-preference-constants";

export async function getOrCreateNotificationPreferences(
  userId: string,
): Promise<NotificationPreferencesData> {
  const row = await prisma.notificationPreferences.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_NOTIFICATION_PREFERENCES },
    update: {},
  });
  return {
    alertsEnabled: row.alertsEnabled,
    shoppingItemsAdded: row.shoppingItemsAdded,
    shoppingListShared: row.shoppingListShared,
    todoListShared: row.todoListShared,
    browserPopups: row.browserPopups,
    browserTitleBadge: row.browserTitleBadge,
  };
}

export async function filterRecipientsForNotificationType(
  recipientIds: string[],
  type: ActivityEventType,
): Promise<string[]> {
  const unique = Array.from(new Set(recipientIds)).filter(Boolean);
  if (unique.length === 0) return [];

  const rows = await prisma.notificationPreferences.findMany({
    where: { userId: { in: unique } },
  });
  const byUser = new Map(rows.map((r) => [r.userId, r]));

  return unique.filter((userId) => {
    const prefs = byUser.get(userId);
    if (!prefs) {
      return isNotificationTypeEnabled(DEFAULT_NOTIFICATION_PREFERENCES, type);
    }
    return isNotificationTypeEnabled(
      {
        alertsEnabled: prefs.alertsEnabled,
        shoppingItemsAdded: prefs.shoppingItemsAdded,
        shoppingListShared: prefs.shoppingListShared,
        todoListShared: prefs.todoListShared,
        browserPopups: prefs.browserPopups,
        browserTitleBadge: prefs.browserTitleBadge,
      },
      type,
    );
  });
}
