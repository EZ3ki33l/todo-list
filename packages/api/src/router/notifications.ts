import { prisma } from "@repo/db";
import { z } from "zod";

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getOrCreateNotificationPreferences,
} from "../lib/notification-preferences";
import { getVapidPublicKey } from "../lib/vapid-config";
import { countUserWebPushSubscriptions } from "../lib/web-push-subscriptions";
import {
  protectedProcedure,
  registerPushInput,
  registerWebPushInput,
  router,
  unregisterWebPushInput,
} from "../trpc";

const updatePreferencesInput = z.object({
  alertsEnabled: z.boolean().optional(),
  shoppingItemsAdded: z.boolean().optional(),
  shoppingListShared: z.boolean().optional(),
  todoListShared: z.boolean().optional(),
  browserPopups: z.boolean().optional(),
  browserTitleBadge: z.boolean().optional(),
});

export const notificationsRouter = router({
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const [prefs, pushCount, webPushCount] = await Promise.all([
      getOrCreateNotificationPreferences(ctx.userId),
      prisma.pushToken.count({ where: { userId: ctx.userId } }),
      countUserWebPushSubscriptions(ctx.userId),
    ]);
    return {
      ...prefs,
      pushRegistered: pushCount > 0,
      webPushRegistered: webPushCount > 0,
      vapidPublicKey: getVapidPublicKey(),
    };
  }),

  updatePreferences: protectedProcedure
    .input(updatePreferencesInput)
    .mutation(async ({ ctx, input }) => {
      await prisma.notificationPreferences.upsert({
        where: { userId: ctx.userId },
        create: { userId: ctx.userId, ...DEFAULT_NOTIFICATION_PREFERENCES, ...input },
        update: input,
      });
      return getOrCreateNotificationPreferences(ctx.userId);
    }),

  /** True si l'utilisateur a activé les notifs (token enregistré). */
  isPushRegistered: protectedProcedure.query(async ({ ctx }) => {
    const count = await prisma.pushToken.count({ where: { userId: ctx.userId } });
    return { registered: count > 0 };
  }),

  registerPushToken: protectedProcedure
    .input(registerPushInput)
    .mutation(async ({ ctx, input }) => {
      // Si le token appartient déjà à un autre utilisateur, on refuse la réassignation
      // pour empêcher le détournement (hijacking) de token push.
      const existing = await prisma.pushToken.findUnique({
        where: { token: input.token },
        select: { userId: true },
      });
      if (existing && existing.userId !== ctx.userId) {
        return existing;
      }
      return prisma.pushToken.upsert({
        where: { token: input.token },
        update: { platform: input.platform ?? null },
        create: {
          userId: ctx.userId,
          token: input.token,
          platform: input.platform ?? null,
        },
      });
    }),

  unregisterPushToken: protectedProcedure
    .input(registerPushInput.pick({ token: true }))
    .mutation(async ({ ctx, input }) => {
      await prisma.pushToken.deleteMany({
        where: { token: input.token, userId: ctx.userId },
      });
    }),

  registerWebPush: protectedProcedure
    .input(registerWebPushInput)
    .mutation(async ({ ctx, input }) => {
      // Même protection que registerPushToken : refuser la réassignation d'un endpoint
      // push Web déjà enregistré par un autre utilisateur.
      const existing = await prisma.webPushSubscription.findUnique({
        where: { endpoint: input.endpoint },
        select: { userId: true },
      });
      if (existing && existing.userId !== ctx.userId) {
        return existing;
      }
      return prisma.webPushSubscription.upsert({
        where: { endpoint: input.endpoint },
        update: {
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
        },
        create: {
          userId: ctx.userId,
          endpoint: input.endpoint,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
        },
      });
    }),

  unregisterWebPush: protectedProcedure
    .input(unregisterWebPushInput)
    .mutation(async ({ ctx, input }) => {
      await prisma.webPushSubscription.deleteMany({
        where: { endpoint: input.endpoint, userId: ctx.userId },
      });
    }),
});
