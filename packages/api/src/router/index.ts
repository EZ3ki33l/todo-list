import { router } from "../trpc";
import { authRouter } from "./auth";
import { listsRouter } from "./lists";
import { actionsRouter } from "./actions";
import { shoppingListsRouter } from "./shoppingLists";
import { shoppingItemsRouter } from "./shoppingItems";

export const appRouter = router({
  auth: authRouter,
  lists: listsRouter,
  actions: actionsRouter,
  shoppingLists: shoppingListsRouter,
  shoppingItems: shoppingItemsRouter,
});

export type AppRouter = typeof appRouter;
