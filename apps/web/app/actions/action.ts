"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  formatZodFormError,
  parseActionId,
  parseCreateActionForm,
  parseTitle,
  parseUpdateActionForm,
  performActionToggle,
} from "@repo/api";
import { prisma } from "@repo/db";

async function requireListAccess(listId: string, mode: "read" | "write" = "write") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  const userId = session.user.id;

  const list = await prisma.todoList.findUnique({
    where: { id: listId },
    include: { members: { where: { userId } } },
  });

  if (!list) throw new Error("Liste introuvable");

  const isOwner = list.ownerId === userId;
  const membership = list.members[0];

  if (mode === "write" && !isOwner && membership?.role !== "membre") {
    throw new Error("Accès refusé");
  }
  if (mode === "read" && !isOwner && !membership) {
    throw new Error("Accès refusé");
  }

  return { userId, list };
}

async function requireActionAccess(actionId: string, mode: "read" | "write" = "write") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  const userId = session.user.id;

  const action = await prisma.action.findUnique({
    where: { id: actionId },
    include: { list: { include: { members: { where: { userId } } } } },
  });

  if (!action) throw new Error("Action introuvable");

  const isOwner = action.list.ownerId === userId;
  const membership = action.list.members[0];

  if (mode === "write" && !isOwner && membership?.role !== "membre") {
    throw new Error("Accès refusé");
  }
  if (mode === "read" && !isOwner && !membership) {
    throw new Error("Accès refusé");
  }

  return { userId, action };
}

export async function createAction(formData: FormData) {
  try {
    const input = parseCreateActionForm(formData);
    await requireListAccess(input.listId, "write");

    const last = await prisma.action.findFirst({
      where: { listId: input.listId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    await prisma.action.create({
      data: {
        listId: input.listId,
        title: input.title,
        position: (last?.position ?? -1) + 1,
        recurrence: input.recurrence,
        recurrenceTime: input.recurrence !== "NONE" ? input.recurrenceTime : null,
        recurrenceDow: input.recurrence === "WEEKLY" ? input.recurrenceDow : null,
        dueAt: input.recurrence === "NONE" && input.dueAt ? new Date(input.dueAt) : null,
      },
    });

    revalidatePath(`/dashboard/lists/${input.listId}`);
    revalidatePath("/dashboard");
  } catch (err) {
    throw new Error(formatZodFormError(err));
  }
}

export async function toggleAction(actionId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  try {
    const id = parseActionId(actionId);
    const result = await performActionToggle(id, session.user.id);

    revalidatePath(`/dashboard/lists/${result.listId}`);
    revalidatePath("/dashboard");

    return {
      listDayComplete: result.listDayComplete,
      listClosed: result.listClosed,
    };
  } catch (err) {
    throw new Error(formatZodFormError(err));
  }
}

export async function deleteAction(actionId: string) {
  try {
    const id = parseActionId(actionId);
    const { action } = await requireActionAccess(id, "write");

    await prisma.action.delete({ where: { id } });

    revalidatePath(`/dashboard/lists/${action.listId}`);
    revalidatePath("/dashboard");
  } catch (err) {
    throw new Error(formatZodFormError(err));
  }
}

export async function renameAction(actionId: string, title: string) {
  try {
    const id = parseActionId(actionId);
    const trimmed = parseTitle(title);
    const { action } = await requireActionAccess(id, "write");

    await prisma.action.update({
      where: { id },
      data: { title: trimmed },
    });

    revalidatePath(`/dashboard/lists/${action.listId}`);
    revalidatePath("/dashboard");
  } catch (err) {
    throw new Error(formatZodFormError(err));
  }
}

export async function updateAction(formData: FormData) {
  try {
    const input = parseUpdateActionForm(formData);
    const { action } = await requireActionAccess(input.actionId, "write");

    await prisma.action.update({
      where: { id: input.actionId },
      data: {
        title: input.title,
        recurrence: input.recurrence,
        recurrenceTime: input.recurrence !== "NONE" ? input.recurrenceTime : null,
        recurrenceDow: input.recurrence === "WEEKLY" ? input.recurrenceDow : null,
        dueAt: input.recurrence === "NONE" && input.dueAt ? new Date(input.dueAt) : null,
      },
    });

    revalidatePath(`/dashboard/lists/${action.listId}`);
    revalidatePath("/dashboard");
  } catch (err) {
    throw new Error(formatZodFormError(err));
  }
}
