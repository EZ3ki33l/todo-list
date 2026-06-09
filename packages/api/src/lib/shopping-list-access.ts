import { TRPCError } from "@trpc/server";
import type { Prisma } from "@repo/db";
import { prisma } from "@repo/db";

import type { ListAccessMode } from "./todo-list-access";

export function shoppingListReadWhere(userId: string): Prisma.ShoppingListWhereInput {
  return {
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };
}

export function shoppingListWriteWhere(userId: string): Prisma.ShoppingListWhereInput {
  return {
    OR: [
      { ownerId: userId },
      { members: { some: { userId, role: "membre" } } },
    ],
  };
}

function accessWhere(userId: string, mode: ListAccessMode): Prisma.ShoppingListWhereInput {
  return mode === "write" ? shoppingListWriteWhere(userId) : shoppingListReadWhere(userId);
}

type ShoppingListFindArgs = Omit<Prisma.ShoppingListFindFirstArgs, "where">;

export async function findAccessibleShoppingList<A extends ShoppingListFindArgs>(
  listId: string,
  userId: string,
  mode: ListAccessMode,
  args?: A,
): Promise<NonNullable<Prisma.ShoppingListGetPayload<A>>> {
  const list = await prisma.shoppingList.findFirst({
    ...args,
    where: { id: listId, ...accessWhere(userId, mode) },
  } as Prisma.ShoppingListFindFirstArgs);

  if (!list) {
    const exists = await prisma.shoppingList.count({ where: { id: listId } });
    throw new TRPCError({
      code: exists ? "FORBIDDEN" : "NOT_FOUND",
      message: exists ? "Accès refusé" : "Liste introuvable",
    });
  }

  return list as unknown as NonNullable<Prisma.ShoppingListGetPayload<A>>;
}

export async function findAccessibleShoppingItem<A extends Omit<Prisma.ShoppingItemFindFirstArgs, "where">>(
  itemId: string,
  userId: string,
  args?: A,
): Promise<NonNullable<Prisma.ShoppingItemGetPayload<A>>> {
  const item = await prisma.shoppingItem.findFirst({
    ...args,
    where: { id: itemId, list: shoppingListWriteWhere(userId) },
  } as Prisma.ShoppingItemFindFirstArgs);

  if (!item) {
    const exists = await prisma.shoppingItem.count({ where: { id: itemId } });
    throw new TRPCError({
      code: exists ? "FORBIDDEN" : "NOT_FOUND",
      message: exists ? "Accès refusé" : "Article introuvable",
    });
  }

  return item as unknown as NonNullable<Prisma.ShoppingItemGetPayload<A>>;
}
