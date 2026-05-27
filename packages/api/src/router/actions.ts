import { TRPCError } from "@trpc/server";

import { prisma } from "@repo/db";
import { protectedProcedure, router, z } from "../trpc";

const recurrenceEnum = z.enum(["NONE", "DAILY", "WEEKLY"]);

async function assertListAccess(listId: string, userId: string, mode: "read" | "write" = "write") {
  const list = await prisma.todoList.findUnique({
    where: { id: listId },
    include: { members: { where: { userId } } },
  });
  if (!list) throw new TRPCError({ code: "NOT_FOUND" });
  const isOwner = list.ownerId === userId;
  const member = list.members[0];
  if (mode === "write" && !isOwner && member?.role !== "membre") throw new TRPCError({ code: "FORBIDDEN" });
  if (mode === "read" && !isOwner && !member) throw new TRPCError({ code: "FORBIDDEN" });
}

async function assertActionAccess(actionId: string, userId: string) {
  const action = await prisma.action.findUnique({
    where: { id: actionId },
    include: { list: { include: { members: { where: { userId } } } } },
  });
  if (!action) throw new TRPCError({ code: "NOT_FOUND" });
  const isOwner = action.list.ownerId === userId;
  const member = action.list.members[0];
  if (!isOwner && member?.role !== "membre") throw new TRPCError({ code: "FORBIDDEN" });
  return action;
}

const actionInput = z.object({
  title: z.string().min(1),
  recurrence: recurrenceEnum.default("NONE"),
  recurrenceTime: z.string().nullable().optional(),
  recurrenceDow: z.number().int().min(0).max(6).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
});

export const actionsRouter = router({
  getByList: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertListAccess(input.listId, ctx.userId, "read");
      return prisma.action.findMany({
        where: { listId: input.listId },
        orderBy: { position: "asc" },
      });
    }),

  getToday: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
    const dow = now.getDay();

    const [ponctual, daily, weekly] = await Promise.all([
      prisma.action.findMany({
        where: { list: { ownerId: ctx.userId }, recurrence: "NONE", dueAt: { gte: todayStart, lt: todayEnd } },
        include: { list: { select: { id: true, title: true } } },
        orderBy: { dueAt: "asc" },
      }),
      prisma.action.findMany({
        where: { list: { ownerId: ctx.userId }, recurrence: "DAILY" },
        include: { list: { select: { id: true, title: true } } },
        orderBy: { recurrenceTime: "asc" },
      }),
      prisma.action.findMany({
        where: { list: { ownerId: ctx.userId }, recurrence: "WEEKLY", recurrenceDow: dow },
        include: { list: { select: { id: true, title: true } } },
        orderBy: { recurrenceTime: "asc" },
      }),
    ]);
    return [...ponctual, ...daily, ...weekly];
  }),

  getWeek: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
    const weekEnd = new Date(todayStart); weekEnd.setDate(weekEnd.getDate() + 7);
    const dow = now.getDay();
    const weekDows = Array.from({ length: 7 }, (_, i) => (dow + i) % 7).filter((d) => d !== dow);

    const [ponctual, weekly] = await Promise.all([
      prisma.action.findMany({
        where: { list: { ownerId: ctx.userId }, recurrence: "NONE", dueAt: { gte: todayEnd, lt: weekEnd } },
        include: { list: { select: { id: true, title: true } } },
        orderBy: { dueAt: "asc" },
      }),
      prisma.action.findMany({
        where: { list: { ownerId: ctx.userId }, recurrence: "WEEKLY", recurrenceDow: { in: weekDows } },
        include: { list: { select: { id: true, title: true } } },
        orderBy: [{ recurrenceDow: "asc" }, { recurrenceTime: "asc" }],
      }),
    ]);
    return [...ponctual, ...weekly];
  }),

  create: protectedProcedure
    .input(actionInput.extend({ listId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertListAccess(input.listId, ctx.userId);
      const last = await prisma.action.findFirst({
        where: { listId: input.listId }, orderBy: { position: "desc" }, select: { position: true },
      });
      return prisma.action.create({
        data: {
          listId: input.listId,
          title: input.title,
          position: (last?.position ?? -1) + 1,
          recurrence: input.recurrence,
          recurrenceTime: input.recurrence !== "NONE" ? (input.recurrenceTime ?? null) : null,
          recurrenceDow: input.recurrence === "WEEKLY" ? (input.recurrenceDow ?? null) : null,
          dueAt: input.recurrence === "NONE" && input.dueAt ? new Date(input.dueAt) : null,
        },
      });
    }),

  update: protectedProcedure
    .input(actionInput.extend({ actionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertActionAccess(input.actionId, ctx.userId);
      return prisma.action.update({
        where: { id: input.actionId },
        data: {
          title: input.title,
          recurrence: input.recurrence,
          recurrenceTime: input.recurrence !== "NONE" ? (input.recurrenceTime ?? null) : null,
          recurrenceDow: input.recurrence === "WEEKLY" ? (input.recurrenceDow ?? null) : null,
          dueAt: input.recurrence === "NONE" && input.dueAt ? new Date(input.dueAt) : null,
        },
      });
    }),

  toggle: protectedProcedure
    .input(z.object({ actionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const action = await assertActionAccess(input.actionId, ctx.userId);
      return prisma.action.update({
        where: { id: input.actionId },
        data: { done: !action.done },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ actionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertActionAccess(input.actionId, ctx.userId);
      await prisma.action.delete({ where: { id: input.actionId } });
    }),
});
