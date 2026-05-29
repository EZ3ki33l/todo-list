import { TRPCError } from "@trpc/server";

import { prisma } from "@repo/db";
import { getOrCreatePersonalTodoList, getSharedTodoLists } from "../lib/default-lists";
import { protectedProcedure, router, z } from "../trpc";

export async function assertListAccess(
  listId: string,
  userId: string,
  mode: "read" | "write" = "write",
) {
  const list = await prisma.todoList.findUnique({
    where: { id: listId },
    include: { members: { where: { userId } } },
  });
  if (!list) throw new TRPCError({ code: "NOT_FOUND" });
  const isOwner = list.ownerId === userId;
  const member = list.members[0];
  if (mode === "write" && !isOwner && member?.role !== "membre") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  if (mode === "read" && !isOwner && !member) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return list;
}

async function assertOwner(listId: string, userId: string) {
  const list = await assertListAccess(listId, userId);
  if (list.ownerId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Seul le propriétaire peut effectuer cette action" });
  }
  return list;
}

export const listsRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return prisma.todoList.findMany({
      where: {
        OR: [
          { ownerId: ctx.userId },
          { members: { some: { userId: ctx.userId } } },
        ],
      },
      include: { _count: { select: { actions: true, members: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }),

  getOrCreatePersonal: protectedProcedure.query(async ({ ctx }) => {
    return getOrCreatePersonalTodoList(ctx.userId);
  }),

  getSharedTodos: protectedProcedure.query(async ({ ctx }) => {
    const personal = await getOrCreatePersonalTodoList(ctx.userId);
    return getSharedTodoLists(ctx.userId, personal.id);
  }),

  getById: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertListAccess(input.listId, ctx.userId, "read");
      return prisma.todoList.findUnique({
        where: { id: input.listId },
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
          },
          owner: { select: { id: true, name: true, email: true, image: true } },
        },
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

  unshare: protectedProcedure
    .input(z.object({ listId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwner(input.listId, ctx.userId);
      await prisma.todoListMember.delete({
        where: { listId_userId: { listId: input.listId, userId: input.userId } },
      });
    }),
});
