import { prisma } from "@repo/db";
import { z } from "zod";

import { getActivityUnreadSnapshot } from "../lib/activity-unread";
import { cuidSchema, protectedProcedure, router } from "../trpc";

const activityListInput = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().datetime().optional(),
});

export const activityRouter = router({
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return getActivityUnreadSnapshot(ctx.userId);
  }),

  list: protectedProcedure.input(activityListInput).query(async ({ ctx, input }) => {
    const items = await prisma.activityEvent.findMany({
      where: {
        userId: ctx.userId,
        ...(input.cursor ? { createdAt: { lt: new Date(input.cursor) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: input.limit + 1,
      select: {
        id: true,
        type: true,
        listKind: true,
        listId: true,
        listTitle: true,
        title: true,
        body: true,
        readAt: true,
        createdAt: true,
        actor: { select: { name: true, email: true, image: true } },
      },
    });

    let nextCursor: string | undefined;
    if (items.length > input.limit) {
      const last = items.pop()!;
      nextCursor = last.createdAt.toISOString();
    }

    return { items, nextCursor };
  }),

  markRead: protectedProcedure
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ ctx, input }) => {
      await prisma.activityEvent.updateMany({
        where: { id: input.id, userId: ctx.userId, readAt: null },
        data: { readAt: new Date() },
      });
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await prisma.activityEvent.updateMany({
      where: { userId: ctx.userId, readAt: null },
      data: { readAt: new Date() },
    });
  }),
});
