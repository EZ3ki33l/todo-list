import { TRPCError } from "@trpc/server";

import { prisma } from "@repo/db";
import { checkGoogleCalendarAccess } from "../lib/google-calendar";
import { ensureUserFromClerk, userHasGoogleAccount } from "../lib/clerk-user";
import { checkRateLimit } from "../lib/rate-limit";
import { verifyClerkSessionToken } from "../lib/verify-clerk-session";
import { issueJwt } from "../jwt";
import { protectedProcedure, publicProcedure, router, signInClerkInput } from "../trpc";

export const authRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { id: true, name: true, email: true, image: true },
    });
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable" });
    }
    return user;
  }),

  linkedProviders: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { clerkId: true },
    });
    const hasGoogle = user?.clerkId
      ? await userHasGoogleAccount(user.clerkId)
      : false;
    return { hasGoogle };
  }),

  googleCalendarStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { clerkId: true },
    });
    if (!user?.clerkId) {
      return { linked: false, hasToken: false, hasCalendarScope: false, tokenScopes: [] };
    }
    return checkGoogleCalendarAccess(user.clerkId);
  }),

  signInWithClerkToken: publicProcedure
    .input(signInClerkInput)
    .mutation(async ({ ctx, input }) => {
      if (!checkRateLimit(`auth:clerk:${ctx.ip}`, 10, 60_000)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Trop de tentatives de connexion. Réessayez dans une minute.",
        });
      }

      let clerkUserId: string;
      try {
        clerkUserId = await verifyClerkSessionToken(input.sessionToken);
      } catch {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Session Clerk invalide" });
      }

      const user = await ensureUserFromClerk(clerkUserId);
      const token = await issueJwt(user.id);

      return {
        token,
        user: { id: user.id, name: user.name, email: user.email, image: user.image },
      };
    }),
});
