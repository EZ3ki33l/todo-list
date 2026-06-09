import { prisma } from "@repo/db";

export async function getOrCreatePersonalTodoList(userId: string) {
  const existing = await prisma.todoList.findFirst({
    where: {
      ownerId: userId,
      status: "ACTIVE",
      members: { none: {} },
    },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.todoList.create({
    data: { title: "Mes tâches", ownerId: userId },
  });
}

export async function getOrCreatePersonalShoppingList(userId: string) {
  const existing = await prisma.shoppingList.findFirst({
    where: {
      ownerId: userId,
      status: "ACTIVE",
      members: { none: {} },
    },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.shoppingList.create({
    data: { title: "Courses", ownerId: userId },
  });
}

export async function getSharedTodoLists(userId: string, personalListId: string) {
  return prisma.todoList.findMany({
    where: {
      status: "ACTIVE",
      id: { not: personalListId },
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: { where: { userId } },
      _count: { select: { members: true, actions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getSharedShoppingLists(userId: string, personalListId: string) {
  return prisma.shoppingList.findMany({
    where: {
      status: "ACTIVE",
      id: { not: personalListId },
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: { where: { userId } },
      _count: { select: { members: true, items: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}
