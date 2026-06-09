import { TRPCError } from "@trpc/server";

import { prisma } from "@repo/db";
import {
  getOrCreatePersonalShoppingList,
  getSharedShoppingLists,
} from "../lib/default-lists";
import { notifyShoppingListShared } from "../lib/shopping-list-share-notify";
import {
  createListInput,
  listIdInput,
  protectedProcedure,
  renameListInput,
  router,
  shareListInput,
  unshareListInput,
  updateListStatusInput,
} from "../trpc";

export async function assertShoppingListAccess(
  listId: string,
  userId: string,
  mode: "read" | "write" = "write",
) {
  const list = await prisma.shoppingList.findUnique({
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

export const shoppingListsRouter = router({
  getOrCreatePersonal: protectedProcedure.query(async ({ ctx }) => {
    return getOrCreatePersonalShoppingList(ctx.userId);
  }),

  getSharedShopping: protectedProcedure.query(async ({ ctx }) => {
    const personal = await getOrCreatePersonalShoppingList(ctx.userId);
    return getSharedShoppingLists(ctx.userId, personal.id);
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    return prisma.shoppingList.findMany({
      where: {
        OR: [
          { ownerId: ctx.userId },
          { members: { some: { userId: ctx.userId } } },
        ],
      },
      include: { _count: { select: { items: true, members: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }),

  getById: protectedProcedure
    .input(listIdInput)
    .query(async ({ ctx, input }) => {
      await assertShoppingListAccess(input.listId, ctx.userId, "read");
      return prisma.shoppingList.findUnique({
        where: { id: input.listId },
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
          owner: { select: { id: true, name: true, email: true, image: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(createListInput)
    .mutation(async ({ ctx, input }) => {
      return prisma.shoppingList.create({
        data: { title: input.title, ownerId: ctx.userId },
      });
    }),

  rename: protectedProcedure
    .input(renameListInput)
    .mutation(async ({ ctx, input }) => {
      await assertShoppingListAccess(input.listId, ctx.userId);
      return prisma.shoppingList.update({
        where: { id: input.listId },
        data: { title: input.title },
      });
    }),

  updateStatus: protectedProcedure
    .input(updateListStatusInput)
    .mutation(async ({ ctx, input }) => {
      // Seul le propriétaire peut archiver/terminer
      const list = await assertShoppingListAccess(input.listId, ctx.userId);
      if (list.ownerId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Seul le propriétaire peut changer le statut" });
      }
      return prisma.shoppingList.update({
        where: { id: input.listId },
        data: { status: input.status },
      });
    }),

  delete: protectedProcedure
    .input(listIdInput)
    .mutation(async ({ ctx, input }) => {
      const list = await assertShoppingListAccess(input.listId, ctx.userId);
      if (list.ownerId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Seul le propriétaire peut supprimer la liste" });
      }
      await prisma.shoppingList.delete({ where: { id: input.listId } });
    }),

  share: protectedProcedure
    .input(shareListInput)
    .mutation(async ({ ctx, input }) => {
      const list = await assertShoppingListAccess(input.listId, ctx.userId);
      if (list.ownerId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Seul le propriétaire peut partager la liste" });
      }
      const target = await prisma.user.findFirst({
        where: { OR: [{ email: input.emailOrId }, { id: input.emailOrId }] },
      });
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable" });
      }
      if (target.id === ctx.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Vous ne pouvez pas partager avec vous-même" });
      }
      const member = await prisma.shoppingListMember.upsert({
        where: { listId_userId: { listId: input.listId, userId: target.id } },
        update: { role: input.role },
        create: { listId: input.listId, userId: target.id, role: input.role },
      });

      const sharer = await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { name: true, email: true },
      });

      void notifyShoppingListShared({
        listId: input.listId,
        listTitle: list.title,
        targetUserId: target.id,
        sharerName: sharer?.name ?? sharer?.email ?? null,
      }).catch((err) => console.error("[share] push notify", err));

      return member;
    }),

  unshare: protectedProcedure
    .input(unshareListInput)
    .mutation(async ({ ctx, input }) => {
      const list = await assertShoppingListAccess(input.listId, ctx.userId);
      if (list.ownerId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Seul le propriétaire peut retirer un membre" });
      }
      await prisma.shoppingListMember.delete({
        where: { listId_userId: { listId: input.listId, userId: input.userId } },
      });
    }),
});
