"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { performActionToggle } from "@repo/api";
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
  const listId = formData.get("listId") as string;
  const title = (formData.get("title") as string)?.trim();
  if (!title) throw new Error("Le titre est requis");

  await requireListAccess(listId, "write");

  const recurrence = (formData.get("recurrence") as string | null) ?? "NONE";
  const recurrenceTime = (formData.get("recurrenceTime") as string | null) ?? null;
  const dueAtRaw = formData.get("dueAt") as string | null;
  const recurrenceDowRaw = formData.get("recurrenceDow") as string | null;

  const last = await prisma.action.findFirst({
    where: { listId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.action.create({
    data: {
      listId,
      title,
      position: (last?.position ?? -1) + 1,
      recurrence: recurrence as "NONE" | "DAILY" | "WEEKLY",
      recurrenceTime: recurrence !== "NONE" ? recurrenceTime : null,
      recurrenceDow: recurrence === "WEEKLY" && recurrenceDowRaw
        ? parseInt(recurrenceDowRaw, 10)
        : null,
      dueAt: recurrence === "NONE" && dueAtRaw ? new Date(dueAtRaw) : null,
    },
  });

  revalidatePath(`/dashboard/lists/${listId}`);
  revalidatePath("/dashboard");
}

export async function toggleAction(actionId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  const result = await performActionToggle(actionId, session.user.id);

  revalidatePath(`/dashboard/lists/${result.listId}`);
  revalidatePath("/dashboard");

  return {
    listDayComplete: result.listDayComplete,
    listClosed: result.listClosed,
  };
}

export async function deleteAction(actionId: string) {
  const { action } = await requireActionAccess(actionId, "write");

  await prisma.action.delete({ where: { id: actionId } });

  revalidatePath(`/dashboard/lists/${action.listId}`);
  revalidatePath("/dashboard");
}

export async function renameAction(actionId: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Le titre ne peut pas être vide");

  const { action } = await requireActionAccess(actionId, "write");

  await prisma.action.update({
    where: { id: actionId },
    data: { title: trimmed },
  });

  revalidatePath(`/dashboard/lists/${action.listId}`);
  revalidatePath("/dashboard");
}

export async function updateAction(formData: FormData) {
  const actionId = formData.get("actionId") as string;
  const title = (formData.get("title") as string)?.trim();
  if (!title) throw new Error("Le titre est requis");

  const { action } = await requireActionAccess(actionId, "write");

  const recurrence = (formData.get("recurrence") as string | null) ?? "NONE";
  const recurrenceTime = (formData.get("recurrenceTime") as string | null) ?? null;
  const dueAtRaw = formData.get("dueAt") as string | null;
  const recurrenceDowRaw = formData.get("recurrenceDow") as string | null;

  await prisma.action.update({
    where: { id: actionId },
    data: {
      title,
      recurrence: recurrence as "NONE" | "DAILY" | "WEEKLY",
      recurrenceTime: recurrence !== "NONE" ? recurrenceTime : null,
      recurrenceDow:
        recurrence === "WEEKLY" && recurrenceDowRaw
          ? parseInt(recurrenceDowRaw, 10)
          : null,
      dueAt: recurrence === "NONE" && dueAtRaw ? new Date(dueAtRaw) : null,
    },
  });

  revalidatePath(`/dashboard/lists/${action.listId}`);
  revalidatePath("/dashboard");
}
