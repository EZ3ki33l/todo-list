import { TRPCError } from "@trpc/server";

import { prisma } from "@repo/db";
import { checkRateLimit } from "../lib/rate-limit";
import { issueJwt } from "../jwt";
import { protectedProcedure, publicProcedure, router, signInGoogleInput } from "../trpc";

function allowedGoogleAudiences(): string[] {
  return [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  ].filter((v): v is string => Boolean(v));
}

async function upsertUser(profile: { sub: string; email?: string; name?: string; picture?: string }) {
  return prisma.user.upsert({
    where: { email: profile.email ?? profile.sub },
    update: { name: profile.name, image: profile.picture },
    create: {
      email: profile.email ?? `${profile.sub}@google.com`,
      name: profile.name,
      image: profile.picture,
      emailVerified: new Date(),
    },
  });
}

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

  signInWithGoogleIdToken: publicProcedure
    .input(signInGoogleInput)
    .mutation(async ({ ctx, input }) => {
      if (!checkRateLimit(`auth:google:${ctx.ip}`, 10, 60_000)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Trop de tentatives de connexion. Réessayez dans une minute.",
        });
      }

      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(input.idToken)}`,
      );

      if (!res.ok) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Token Google invalide" });
      }

      const payload = (await res.json()) as {
        sub?: string;
        email?: string;
        name?: string;
        picture?: string;
        aud?: string;
        iss?: string;
        exp?: string;
      };

      if (!payload.sub) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Token invalide" });
      }

      const allowedIss = ["accounts.google.com", "https://accounts.google.com"];
      if (!payload.iss || !allowedIss.includes(payload.iss)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Émetteur du token invalide" });
      }

      const audiences = allowedGoogleAudiences();
      if (audiences.length > 0 && (!payload.aud || !audiences.includes(payload.aud))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Audience du token invalide" });
      }

      if (payload.exp) {
        const expMs = Number.parseInt(payload.exp, 10) * 1000;
        if (!Number.isFinite(expMs) || expMs < Date.now()) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Token expiré" });
        }
      }

      const user = await upsertUser({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      });
      const token = await issueJwt(user.id);

      return {
        token,
        user: { id: user.id, name: user.name, email: user.email, image: user.image },
      };
    }),
});
