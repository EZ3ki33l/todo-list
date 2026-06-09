import { TRPCError } from "@trpc/server";

import { prisma } from "@repo/db";
import { assertOrderedIdsMatch } from "../lib/reorder-positions";
import { getShoppingListCatalog } from "../lib/shopping-list-catalog";
import {
  getFrequentShoppingItems,
  recordShoppingItemStat,
} from "../lib/shopping-item-stat";
import { scheduleShoppingItemNotification } from "../lib/shopping-notify-scheduler";
import {
  itemIdInput,
  listIdInput,
  protectedProcedure,
  reorderInput,
  router,
  shoppingItemInputSchema,
  z,
} from "../trpc";
import { assertShoppingListAccess } from "./shoppingLists";

async function assertShoppingItemAccess(itemId: string, userId: string) {
  const item = await prisma.shoppingItem.findUnique({
    where: { id: itemId },
    include: { list: { include: { members: { where: { userId } } } } },
  });
  if (!item) throw new TRPCError({ code: "NOT_FOUND" });
  const isOwner = item.list.ownerId === userId;
  const member = item.list.members[0];
  if (!isOwner && member?.role !== "membre") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return item;
}

export const shoppingItemsRouter = router({
  /** Articles ajoutés souvent par l'utilisateur (toutes listes confondues). */
  getFrequent: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(24).optional(),
          minUseCount: z.number().int().min(1).max(20).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return getFrequentShoppingItems(ctx.userId, input);
    }),

  /** Articles déjà vus sur cette liste (tous les membres), pour listes partagées. */
  getListCatalog: protectedProcedure
    .input(
      z
        .object({
          listId: listIdInput.shape.listId,
          limit: z.number().int().min(1).max(48).optional(),
        }),
    )
    .query(async ({ ctx, input }) => {
      await assertShoppingListAccess(input.listId, ctx.userId, "read");
      const list = await prisma.shoppingList.findUnique({
        where: { id: input.listId },
        select: { ownerId: true, members: { select: { userId: true } } },
      });
      if (!list) throw new TRPCError({ code: "NOT_FOUND" });
      const isShared = list.members.length > 0;
      if (!isShared) return [];
      return getShoppingListCatalog(input.listId, input.limit);
    }),

  getByList: protectedProcedure
    .input(listIdInput)
    .query(async ({ ctx, input }) => {
      await assertShoppingListAccess(input.listId, ctx.userId, "read");
      return prisma.shoppingItem.findMany({
        where: { listId: input.listId },
        orderBy: [{ checked: "asc" }, { position: "asc" }],
      });
    }),

  create: protectedProcedure
    .input(shoppingItemInputSchema.extend({ listId: listIdInput.shape.listId }))
    .mutation(async ({ ctx, input }) => {
      await assertShoppingListAccess(input.listId, ctx.userId);
      const last = await prisma.shoppingItem.findFirst({
        where: { listId: input.listId },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const item = await prisma.shoppingItem.create({
        data: {
          listId: input.listId,
          title: input.title,
          quantity: input.quantity ?? null,
          unit: input.unit ?? null,
          category: input.category,
          icon: input.icon ?? null,
          position: (last?.position ?? -1) + 1,
        },
      });

      try {
        await recordShoppingItemStat(ctx.userId, {
          title: input.title,
          category: input.category,
          quantity: input.quantity ?? null,
          unit: input.unit ?? null,
        });
      } catch (err) {
        console.error("[shopping] recordShoppingItemStat", err);
      }

      void scheduleShoppingItemNotification({
        listId: input.listId,
        actorUserId: ctx.userId,
        itemTitle: input.title,
        quantity: input.quantity ?? null,
        unit: input.unit ?? null,
      }).catch((err) => console.error("[push] scheduleShoppingItemNotification", err));

      return item;
    }),

  update: protectedProcedure
    .input(shoppingItemInputSchema.extend({ itemId: itemIdInput.shape.itemId }))
    .mutation(async ({ ctx, input }) => {
      await assertShoppingItemAccess(input.itemId, ctx.userId);
      const updated = await prisma.shoppingItem.update({
        where: { id: input.itemId },
        data: {
          title: input.title,
          quantity: input.quantity ?? null,
          unit: input.unit ?? null,
          category: input.category,
          icon: input.icon ?? null,
        },
      });

      try {
        await recordShoppingItemStat(ctx.userId, {
          title: input.title,
          category: input.category,
          quantity: input.quantity ?? null,
          unit: input.unit ?? null,
        });
      } catch (err) {
        console.error("[shopping] recordShoppingItemStat", err);
      }

      return updated;
    }),

  toggle: protectedProcedure
    .input(itemIdInput)
    .mutation(async ({ ctx, input }) => {
      const item = await assertShoppingItemAccess(input.itemId, ctx.userId);
      return prisma.shoppingItem.update({
        where: { id: input.itemId },
        data: { checked: !item.checked },
      });
    }),

  delete: protectedProcedure
    .input(itemIdInput)
    .mutation(async ({ ctx, input }) => {
      await assertShoppingItemAccess(input.itemId, ctx.userId);
      await prisma.shoppingItem.delete({ where: { id: input.itemId } });
    }),

  clearChecked: protectedProcedure
    .input(listIdInput)
    .mutation(async ({ ctx, input }) => {
      await assertShoppingListAccess(input.listId, ctx.userId);
      const result = await prisma.shoppingItem.deleteMany({
        where: { listId: input.listId, checked: true },
      });
      return { deleted: result.count };
    }),

  reorder: protectedProcedure
    .input(reorderInput)
    .mutation(async ({ ctx, input }) => {
      await assertShoppingListAccess(input.listId, ctx.userId);
      const existing = await prisma.shoppingItem.findMany({
        where: { listId: input.listId },
        select: { id: true },
        orderBy: [{ checked: "asc" }, { position: "asc" }],
      });
      assertOrderedIdsMatch(
        existing.map((i) => i.id),
        input.orderedIds,
      );
      await prisma.$transaction(
        input.orderedIds.map((id, position) =>
          prisma.shoppingItem.update({ where: { id }, data: { position } }),
        ),
      );
      return { ok: true };
    }),
});
