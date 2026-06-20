import { TRPCError } from "@trpc/server";

import { prisma } from "@repo/db";
import {
  getOrCreatePersonalShoppingList,
  getSharedShoppingLists,
} from "../lib/default-lists";
import { notifyListShared } from "../lib/list-share-notify";
import { findAccessibleShoppingList } from "../lib/shopping-list-access";
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

/** @deprecated Utiliser findAccessibleShoppingList — conservé pour compat interne. */
export async function assertShoppingListAccess(
  listId: string,
  userId: string,
  mode: "read" | "write" = "write",
) {
  return findAccessibleShoppingList(listId, userId, mode);
}

async function assertShoppingOwner(listId: string, userId: string) {
  const list = await findAccessibleShoppingList(listId, userId, "write");
  if (list.ownerId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Seul le propriétaire peut effectuer cette action",
    });
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
      return findAccessibleShoppingList(input.listId, ctx.userId, "read", {
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

  // Note : rename est accessible à tous les membres write (pas uniquement le propriétaire),
  // contrairement aux listes de tâches. Comportement intentionnel pour les courses partagées.
  rename: protectedProcedure
    .input(renameListInput)
    .mutation(async ({ ctx, input }) => {
      await findAccessibleShoppingList(input.listId, ctx.userId, "write", { select: { id: true } });
      return prisma.shoppingList.update({
        where: { id: input.listId },
        data: { title: input.title },
      });
    }),

  updateStatus: protectedProcedure
    .input(updateListStatusInput)
    .mutation(async ({ ctx, input }) => {
      await assertShoppingOwner(input.listId, ctx.userId);
      return prisma.shoppingList.update({
        where: { id: input.listId },
        data: { status: input.status },
      });
    }),

  delete: protectedProcedure
    .input(listIdInput)
    .mutation(async ({ ctx, input }) => {
      await assertShoppingOwner(input.listId, ctx.userId);
      await prisma.shoppingList.delete({ where: { id: input.listId } });
    }),

  share: protectedProcedure
    .input(shareListInput)
    .mutation(async ({ ctx, input }) => {
      const list = await assertShoppingOwner(input.listId, ctx.userId);
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

      void notifyListShared({
        kind: "SHOPPING",
        listId: input.listId,
        listTitle: list.title,
        targetUserId: target.id,
        sharerUserId: ctx.userId,
        sharerName: sharer?.name ?? sharer?.email ?? null,
      }).catch((err) => console.error("[share] push notify", err));

      return member;
    }),

  unshare: protectedProcedure
    .input(unshareListInput)
    .mutation(async ({ ctx, input }) => {
      await assertShoppingOwner(input.listId, ctx.userId);
      await prisma.shoppingListMember.delete({
        where: { listId_userId: { listId: input.listId, userId: input.userId } },
      });
    }),
});
