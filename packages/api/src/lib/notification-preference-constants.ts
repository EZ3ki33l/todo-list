/** Constantes partagées — sans Prisma, importables côté client (web / native). */

export type ActivityEventType =
  | "SHOPPING_LIST_SHARED"
  | "SHOPPING_ITEMS_ADDED"
  | "TODO_LIST_SHARED";

export type NotificationPreferencesData = {
  alertsEnabled: boolean;
  shoppingItemsAdded: boolean;
  shoppingListShared: boolean;
  todoListShared: boolean;
  browserPopups: boolean;
  browserTitleBadge: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesData = {
  alertsEnabled: true,
  shoppingItemsAdded: true,
  shoppingListShared: true,
  todoListShared: true,
  browserPopups: false,
  browserTitleBadge: true,
};

export const NOTIFICATION_TYPE_OPTIONS: {
  key: keyof Pick<
    NotificationPreferencesData,
    "shoppingItemsAdded" | "shoppingListShared" | "todoListShared"
  >;
  eventType: ActivityEventType;
  label: string;
  description: string;
}[] = [
  {
    key: "shoppingItemsAdded",
    eventType: "SHOPPING_ITEMS_ADDED",
    label: "Articles ajoutés",
    description: "Quand quelqu'un ajoute des produits sur une liste courses partagée",
  },
  {
    key: "shoppingListShared",
    eventType: "SHOPPING_LIST_SHARED",
    label: "Partage liste courses",
    description: "Quand une liste de courses vous est partagée",
  },
  {
    key: "todoListShared",
    eventType: "TODO_LIST_SHARED",
    label: "Partage liste tâches",
    description: "Quand une liste de tâches vous est partagée",
  },
];

export function isNotificationTypeEnabled(
  prefs: NotificationPreferencesData,
  type: ActivityEventType,
): boolean {
  if (!prefs.alertsEnabled) return false;
  switch (type) {
    case "SHOPPING_ITEMS_ADDED":
      return prefs.shoppingItemsAdded;
    case "SHOPPING_LIST_SHARED":
      return prefs.shoppingListShared;
    case "TODO_LIST_SHARED":
      return prefs.todoListShared;
    default:
      return false;
  }
}
