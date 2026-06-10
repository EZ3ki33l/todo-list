/** Miroir de @repo/api/notification-constants — sans import runtime du package api. */

export const NOTIFICATION_TYPE_OPTIONS = [
  {
    key: "shoppingItemsAdded" as const,
    eventType: "SHOPPING_ITEMS_ADDED" as const,
    label: "Articles ajoutés",
    description: "Quand quelqu'un ajoute des produits sur une liste courses partagée",
  },
  {
    key: "shoppingListShared" as const,
    eventType: "SHOPPING_LIST_SHARED" as const,
    label: "Partage liste courses",
    description: "Quand une liste de courses vous est partagée",
  },
  {
    key: "todoListShared" as const,
    eventType: "TODO_LIST_SHARED" as const,
    label: "Partage liste tâches",
    description: "Quand une liste de tâches vous est partagée",
  },
] as const;
