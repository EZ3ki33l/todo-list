import { SignJWT } from "jose";
import { TRPCError } from "@trpc/server";

import { prisma } from "@repo/db";
import { publicProcedure, router, z } from "../trpc";

function getJwtSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET!);
}

async function issueJwt(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecret());
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
  signInWithGoogleIdToken: publicProcedure
    .input(z.object({ idToken: z.string() }))
    .mutation(async ({ input }) => {
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${input.idToken}`,
      );

      if (!res.ok) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Token Google invalide" });
      }

      const payload = await res.json() as {
        sub?: string;
        email?: string;
        name?: string;
        picture?: string;
        aud?: string;
      };

      if (!payload.sub) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Token invalide" });
      }

      const user = await upsertUser(payload as { sub: string; email?: string; name?: string; picture?: string });
      const token = await issueJwt(user.id);

      return {
        token,
        user: { id: user.id, name: user.name, email: user.email, image: user.image },
      };
    }),
});
