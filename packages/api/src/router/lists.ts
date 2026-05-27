import { TRPCError } from "@trpc/server";

import { prisma } from "@repo/db";
import { protectedProcedure, router, z } from "../trpc";

async function assertOwner(listId: string, userId: string) {
  const list = await prisma.todoList.findUnique({ where: { id: listId } });
  if (!list) throw new TRPCError({ code: "NOT_FOUND" });
  if (list.ownerId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
  return list;
}

export const listsRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return prisma.todoList.findMany({
      where: { ownerId: ctx.userId },
      include: { _count: { select: { actions: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }),

  create: protectedProcedure
    .input(z.object({ title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return prisma.todoList.create({
        data: { title: input.title, ownerId: ctx.userId },
      });
    }),

  rename: protectedProcedure
    .input(z.object({ listId: z.string(), title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await assertOwner(input.listId, ctx.userId);
      return prisma.todoList.update({
        where: { id: input.listId },
        data: { title: input.title },
      });
    }),

  updateStatus: protectedProcedure
    .input(z.object({ listId: z.string(), status: z.enum(["ACTIVE", "ARCHIVED", "DONE"]) }))
    .mutation(async ({ ctx, input }) => {
      await assertOwner(input.listId, ctx.userId);
      return prisma.todoList.update({
        where: { id: input.listId },
        data: { status: input.status },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwner(input.listId, ctx.userId);
      await prisma.todoList.delete({ where: { id: input.listId } });
    }),

  share: protectedProcedure
    .input(z.object({
      listId: z.string(),
      emailOrId: z.string().min(1),
      role: z.enum(["membre", "invité"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertOwner(input.listId, ctx.userId);
      const target = await prisma.user.findFirst({
        where: { OR: [{ email: input.emailOrId }, { id: input.emailOrId }] },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable" });
      if (target.id === ctx.userId) throw new TRPCError({ code: "BAD_REQUEST", message: "Vous ne pouvez pas partager avec vous-même" });
      return prisma.todoListMember.upsert({
        where: { listId_userId: { listId: input.listId, userId: target.id } },
        update: { role: input.role },
        create: { listId: input.listId, userId: target.id, role: input.role },
      });
    }),
});
