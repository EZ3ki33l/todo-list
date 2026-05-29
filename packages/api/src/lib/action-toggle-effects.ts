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
  const list = await prisma.todoList.findUnique({
    where: { id: listId },
    include: { actions: true },
  });
  if (!list) return { listDayComplete: false, listClosed: false };

  const listDayComplete = isListDayComplete(list.actions, now);
  let listClosed = false;

  if (
    list.status === "ACTIVE" &&
    list.ownerId === userId &&
    areAllPonctualDone(list.actions)
  ) {
    await prisma.todoList.update({
      where: { id: listId },
      data: { status: "DONE" },
    });
    listClosed = true;
  }

  return { listDayComplete, listClosed };
}
