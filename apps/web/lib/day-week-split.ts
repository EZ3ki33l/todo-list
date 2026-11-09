import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@repo/api/server";

export * from "@repo/domain/day-week-split";

export type ActionRow = inferRouterOutputs<AppRouter>["actions"]["getByList"][number];
