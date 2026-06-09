import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";
import { checkRateLimit } from "./lib/rate-limit";

export { z } from "zod";
export * from "./schemas";

const t = initTRPC.context<Context>().create();

const rateLimitMiddleware = t.middleware(async ({ ctx, next, type }) => {
  const isMutation = type === "mutation";
  const ipLimit = isMutation ? 90 : 180;
  const userLimit = isMutation ? 120 : 240;

  if (!checkRateLimit(`trpc:ip:${ctx.ip}`, ipLimit, 60_000)) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Trop de requêtes. Réessayez plus tard." });
  }

  if (ctx.userId && !checkRateLimit(`trpc:user:${ctx.userId}`, userLimit, 60_000)) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Trop de requêtes. Réessayez plus tard." });
  }

  return next();
});

export const router = t.router;
export const publicProcedure = t.procedure.use(rateLimitMiddleware);

export const protectedProcedure = t.procedure.use(rateLimitMiddleware).use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});
