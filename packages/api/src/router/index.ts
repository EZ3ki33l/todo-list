import { router } from "../trpc";
import { authRouter } from "./auth";
import { listsRouter } from "./lists";
import { actionsRouter } from "./actions";
import { shoppingListsRouter } from "./shoppingLists";
import { shoppingItemsRouter } from "./shoppingItems";
import { notificationsRouter } from "./notifications";

export const appRouter = router({
  auth: authRouter,
  lists: listsRouter,
  actions: actionsRouter,
  shoppingLists: shoppingListsRouter,
  shoppingItems: shoppingItemsRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
