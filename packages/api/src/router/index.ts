import { router } from "../trpc";
import { authRouter } from "./auth";
import { listsRouter } from "./lists";
import { actionsRouter } from "./actions";

export const appRouter = router({
  auth: authRouter,
  lists: listsRouter,
  actions: actionsRouter,
});

export type AppRouter = typeof appRouter;
