import { TRPCError } from "@trpc/server";
import type { Prisma } from "@repo/db";
import { prisma } from "@repo/db";

export type ListAccessMode = "read" | "write";

export function todoListReadWhere(userId: string): Prisma.TodoListWhereInput {
  return {
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };
}

export function todoListWriteWhere(userId: string): Prisma.TodoListWhereInput {
  return {
    OR: [
      { ownerId: userId },
      { members: { some: { userId, role: "membre" } } },
    ],
  };
}

function accessWhere(userId: string, mode: ListAccessMode): Prisma.TodoListWhereInput {
  return mode === "write" ? todoListWriteWhere(userId) : todoListReadWhere(userId);
}

type TodoListFindArgs = Omit<Prisma.TodoListFindFirstArgs, "where">;

export async function findAccessibleTodoList<A extends TodoListFindArgs>(
  listId: string,
  userId: string,
  mode: ListAccessMode,
  args?: A,
): Promise<NonNullable<Prisma.TodoListGetPayload<A>>> {
  const list = await prisma.todoList.findFirst({
    ...args,
    where: { id: listId, ...accessWhere(userId, mode) },
  } as Prisma.TodoListFindFirstArgs);

  if (!list) {
    const exists = await prisma.todoList.count({ where: { id: listId } });
    throw new TRPCError({
      code: exists ? "FORBIDDEN" : "NOT_FOUND",
      message: exists ? "Accès refusé" : "Liste introuvable",
    });
  }

  return list as unknown as NonNullable<Prisma.TodoListGetPayload<A>>;
}

export async function findAccessibleAction<A extends Omit<Prisma.ActionFindFirstArgs, "where">>(
  actionId: string,
  userId: string,
  args?: A,
): Promise<NonNullable<Prisma.ActionGetPayload<A>>> {
  const action = await prisma.action.findFirst({
    ...args,
    where: { id: actionId, list: todoListWriteWhere(userId) },
  } as Prisma.ActionFindFirstArgs);

  if (!action) {
    const exists = await prisma.action.count({ where: { id: actionId } });
    throw new TRPCError({
      code: exists ? "FORBIDDEN" : "NOT_FOUND",
      message: exists ? "Accès refusé" : "Action introuvable",
    });
  }

  return action as unknown as NonNullable<Prisma.ActionGetPayload<A>>;
}
