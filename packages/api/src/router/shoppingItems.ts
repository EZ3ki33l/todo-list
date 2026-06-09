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
import {
  findAccessibleShoppingItem,
  findAccessibleShoppingList,
} from "../lib/shopping-list-access";

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
      const list = await findAccessibleShoppingList(input.listId, ctx.userId, "read", {
        select: { members: { select: { userId: true } } },
      });
      if (list.members.length === 0) return [];
      return getShoppingListCatalog(input.listId, input.limit);
    }),

  getByList: protectedProcedure
    .input(listIdInput)
    .query(async ({ ctx, input }) => {
      const list = await findAccessibleShoppingList(input.listId, ctx.userId, "read", {
        include: { items: { orderBy: [{ checked: "asc" }, { position: "asc" }] } },
      });
      return list.items;
    }),

  create: protectedProcedure
    .input(shoppingItemInputSchema.extend({ listId: listIdInput.shape.listId }))
    .mutation(async ({ ctx, input }) => {
      await findAccessibleShoppingList(input.listId, ctx.userId, "write", { select: { id: true } });
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
      await findAccessibleShoppingItem(input.itemId, ctx.userId, { select: { id: true } });
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
      const item = await findAccessibleShoppingItem(input.itemId, ctx.userId);
      return prisma.shoppingItem.update({
        where: { id: input.itemId },
        data: { checked: !item.checked },
      });
    }),

  delete: protectedProcedure
    .input(itemIdInput)
    .mutation(async ({ ctx, input }) => {
      await findAccessibleShoppingItem(input.itemId, ctx.userId, { select: { id: true } });
      await prisma.shoppingItem.delete({ where: { id: input.itemId } });
    }),

  clearChecked: protectedProcedure
    .input(listIdInput)
    .mutation(async ({ ctx, input }) => {
      await findAccessibleShoppingList(input.listId, ctx.userId, "write", { select: { id: true } });
      const result = await prisma.shoppingItem.deleteMany({
        where: { listId: input.listId, checked: true },
      });
      return { deleted: result.count };
    }),

  reorder: protectedProcedure
    .input(reorderInput)
    .mutation(async ({ ctx, input }) => {
      await findAccessibleShoppingList(input.listId, ctx.userId, "write", { select: { id: true } });
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
