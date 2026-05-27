import { TRPCError } from "@trpc/server";

import { prisma } from "@repo/db";
import { protectedProcedure, router, z } from "../trpc";
import { assertShoppingListAccess } from "./shoppingLists";

const groceryCategoryEnum = z.enum([
  "LEGUME",
  "FRUIT",
  "VIANDE",
  "POISSON",
  "BOULANGERIE",
  "EPICERIE",
  "LAITIER",
  "BOISSON",
  "HYGIENE",
  "AUTRE",
]);

const itemInput = z.object({
  title: z.string().min(1),
  quantity: z.number().positive().nullable().optional(),
  unit: z.string().max(20).nullable().optional(),
  category: groceryCategoryEnum.default("AUTRE"),
  icon: z.string().max(64).nullable().optional(),
});

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
  getByList: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertShoppingListAccess(input.listId, ctx.userId, "read");
      return prisma.shoppingItem.findMany({
        where: { listId: input.listId },
        orderBy: [{ checked: "asc" }, { position: "asc" }],
      });
    }),

  create: protectedProcedure
    .input(itemInput.extend({ listId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertShoppingListAccess(input.listId, ctx.userId);
      const last = await prisma.shoppingItem.findFirst({
        where: { listId: input.listId },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      return prisma.shoppingItem.create({
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
    }),

  update: protectedProcedure
    .input(itemInput.extend({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertShoppingItemAccess(input.itemId, ctx.userId);
      return prisma.shoppingItem.update({
        where: { id: input.itemId },
        data: {
          title: input.title,
          quantity: input.quantity ?? null,
          unit: input.unit ?? null,
          category: input.category,
          icon: input.icon ?? null,
        },
      });
    }),

  toggle: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await assertShoppingItemAccess(input.itemId, ctx.userId);
      return prisma.shoppingItem.update({
        where: { id: input.itemId },
        data: { checked: !item.checked },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertShoppingItemAccess(input.itemId, ctx.userId);
      await prisma.shoppingItem.delete({ where: { id: input.itemId } });
    }),

  clearChecked: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertShoppingListAccess(input.listId, ctx.userId);
      const result = await prisma.shoppingItem.deleteMany({
        where: { listId: input.listId, checked: true },
      });
      return { deleted: result.count };
    }),
});
