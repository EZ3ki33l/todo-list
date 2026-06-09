import { TRPCError } from "@trpc/server";

import { prisma } from "@repo/db";
import { assertOrderedIdsMatch } from "../lib/reorder-positions";
import { withEffectiveDone } from "../lib/action-recurrence";
import { performActionToggle } from "../lib/perform-action-toggle";
import {
  findAccessibleAction,
  findAccessibleTodoList,
} from "../lib/todo-list-access";
import {
  actionIdInput,
  createActionInput,
  listIdInput,
  protectedProcedure,
  reorderInput,
  router,
  updateActionInput,
} from "../trpc";

export const actionsRouter = router({
  getByList: protectedProcedure
    .input(listIdInput)
    .query(async ({ ctx, input }) => {
      const list = await findAccessibleTodoList(input.listId, ctx.userId, "read", {
        include: { actions: { orderBy: { position: "asc" } } },
      });
      return list.actions.map((a) => withEffectiveDone(a));
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
    return [...ponctual, ...daily, ...weekly].map((a) => withEffectiveDone(a, now));
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
    return [...ponctual, ...weekly].map((a) => withEffectiveDone(a, now));
  }),

  create: protectedProcedure
    .input(createActionInput)
    .mutation(async ({ ctx, input }) => {
      await findAccessibleTodoList(input.listId, ctx.userId, "write", { select: { id: true } });
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
    .input(updateActionInput)
    .mutation(async ({ ctx, input }) => {
      await findAccessibleAction(input.actionId, ctx.userId, { select: { id: true } });
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
    .input(actionIdInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await performActionToggle(input.actionId, ctx.userId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur toggle";
        if (message === "Action introuvable") {
          throw new TRPCError({ code: "NOT_FOUND", message });
        }
        if (message === "Accès refusé") {
          throw new TRPCError({ code: "FORBIDDEN", message });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  delete: protectedProcedure
    .input(actionIdInput)
    .mutation(async ({ ctx, input }) => {
      await findAccessibleAction(input.actionId, ctx.userId, { select: { id: true } });
      await prisma.action.delete({ where: { id: input.actionId } });
    }),

  reorder: protectedProcedure
    .input(reorderInput)
    .mutation(async ({ ctx, input }) => {
      await findAccessibleTodoList(input.listId, ctx.userId, "write", { select: { id: true } });
      const existing = await prisma.action.findMany({
        where: { listId: input.listId },
        select: { id: true },
        orderBy: { position: "asc" },
      });
      assertOrderedIdsMatch(
        existing.map((a) => a.id),
        input.orderedIds,
      );
      await prisma.$transaction(
        input.orderedIds.map((id, position) =>
          prisma.action.update({ where: { id }, data: { position } }),
        ),
      );
      return { ok: true };
    }),
});
