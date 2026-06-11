import { router } from "../trpc";
import { authRouter } from "./auth";
import { listsRouter } from "./lists";
import { actionsRouter } from "./actions";
import { shoppingListsRouter } from "./shoppingLists";
import { shoppingItemsRouter } from "./shoppingItems";
import { notificationsRouter } from "./notifications";
import { activityRouter } from "./activity";
import { recipesRouter } from "./recipes";

export const appRouter = router({
  auth: authRouter,
  lists: listsRouter,
  actions: actionsRouter,
  shoppingLists: shoppingListsRouter,
  shoppingItems: shoppingItemsRouter,
  notifications: notificationsRouter,
  activity: activityRouter,
  recipes: recipesRouter,
});

export type AppRouter = typeof appRouter;
