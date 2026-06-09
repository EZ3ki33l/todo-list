import { prisma } from "@repo/db";

import { areAllPonctualDone, isListDayComplete } from "./list-day-completion";

export type ToggleSideEffects = {
  listDayComplete: boolean;
  listClosed: boolean;
};

export async function evaluateListAfterToggle(
  listId: string,
  userId: string,
  now: Date,
): Promise<ToggleSideEffects> {
  const [list, actions] = await Promise.all([
    prisma.todoList.findUnique({
      where: { id: listId },
      select: { status: true, ownerId: true },
    }),
    prisma.action.findMany({
      where: { listId },
      select: {
        done: true,
        doneAt: true,
        recurrence: true,
        dueAt: true,
        recurrenceDow: true,
        updatedAt: true,
      },
    }),
  ]);
  if (!list) return { listDayComplete: false, listClosed: false };

  const listDayComplete = isListDayComplete(actions, now);
  let listClosed = false;

  if (list.status === "ACTIVE" && list.ownerId === userId && areAllPonctualDone(actions)) {
    await prisma.todoList.update({
      where: { id: listId },
      data: { status: "DONE" },
    });
    listClosed = true;
  }

  return { listDayComplete, listClosed };
}
