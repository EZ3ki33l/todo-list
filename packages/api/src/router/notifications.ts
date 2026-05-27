import { prisma } from "@repo/db";
import { protectedProcedure, router, z } from "../trpc";

export const notificationsRouter = router({
  /** True si l'utilisateur a activé les notifs (token enregistré). */
  isPushRegistered: protectedProcedure.query(async ({ ctx }) => {
    const count = await prisma.pushToken.count({ where: { userId: ctx.userId } });
    return { registered: count > 0 };
  }),

  registerPushToken: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1),
        platform: z.enum(["android", "ios", "web"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.pushToken.upsert({
        where: { token: input.token },
        update: {
          userId: ctx.userId,
          platform: input.platform ?? null,
        },
        create: {
          userId: ctx.userId,
          token: input.token,
          platform: input.platform ?? null,
        },
      });
    }),

  unregisterPushToken: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await prisma.pushToken.deleteMany({
        where: { token: input.token, userId: ctx.userId },
      });
    }),
});
