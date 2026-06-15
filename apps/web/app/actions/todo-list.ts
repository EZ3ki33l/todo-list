"use server";

import { revalidatePath } from "next/cache";

import { getAppUser } from "@/lib/app-session";
import {
  formatZodFormError,
  parseCreateListForm,
  parseListId,
  parseShareListForm,
  parseTitle,
} from "@repo/api";
import { prisma } from "@repo/db";

async function requireSession() {
  const user = await getAppUser();
  if (!user) throw new Error("Non authentifié");
  return user.id;
}

async function assertListOwner(listId: string, userId: string) {
  const id = parseListId(listId);
  const list = await prisma.todoList.findUnique({ where: { id } });
  if (!list || list.ownerId !== userId) throw new Error("Accès refusé");
  return list;
}

export async function createTodoList(formData: FormData) {
  try {
    const userId = await requireSession();
    const { title } = parseCreateListForm(formData);

    await prisma.todoList.create({
      data: { title, ownerId: userId },
    });

    revalidatePath("/dashboard");
  } catch (err) {
    throw new Error(formatZodFormError(err));
  }
}

export async function archiveTodoList(listId: string) {
  try {
    const userId = await requireSession();
    await assertListOwner(listId, userId);

    await prisma.todoList.update({
      where: { id: parseListId(listId) },
      data: { status: "ARCHIVED" },
    });

    revalidatePath("/dashboard");
  } catch (err) {
    throw new Error(formatZodFormError(err));
  }
}

export async function completeTodoList(listId: string) {
  try {
    const userId = await requireSession();
    await assertListOwner(listId, userId);

    await prisma.todoList.update({
      where: { id: parseListId(listId) },
      data: { status: "DONE" },
    });

    revalidatePath("/dashboard");
  } catch (err) {
    throw new Error(formatZodFormError(err));
  }
}

export async function restoreTodoList(listId: string) {
  try {
    const userId = await requireSession();
    await assertListOwner(listId, userId);

    await prisma.todoList.update({
      where: { id: parseListId(listId) },
      data: { status: "ACTIVE" },
    });

    revalidatePath("/dashboard");
  } catch (err) {
    throw new Error(formatZodFormError(err));
  }
}

export async function deleteTodoList(listId: string) {
  try {
    const userId = await requireSession();
    await assertListOwner(listId, userId);

    await prisma.todoList.delete({ where: { id: parseListId(listId) } });

    revalidatePath("/dashboard");
  } catch (err) {
    throw new Error(formatZodFormError(err));
  }
}

export async function renameTodoList(listId: string, title: string) {
  try {
    const userId = await requireSession();
    await assertListOwner(listId, userId);
    const trimmed = parseTitle(title);

    await prisma.todoList.update({
      where: { id: parseListId(listId) },
      data: { title: trimmed },
    });

    revalidatePath("/dashboard");
  } catch (err) {
    throw new Error(formatZodFormError(err));
  }
}

export async function shareTodoList(formData: FormData) {
  try {
    const userId = await requireSession();
    const input = parseShareListForm(formData);

    await assertListOwner(input.listId, userId);

    const target = await prisma.user.findFirst({
      where: { OR: [{ email: input.emailOrId }, { id: input.emailOrId }] },
    });

    if (!target) throw new Error("Utilisateur introuvable");
    if (target.id === userId) throw new Error("Vous ne pouvez pas partager une liste avec vous-même");

    await prisma.todoListMember.upsert({
      where: { listId_userId: { listId: input.listId, userId: target.id } },
      update: { role: input.role },
      create: { listId: input.listId, userId: target.id, role: input.role },
    });

    revalidatePath("/dashboard");
  } catch (err) {
    throw new Error(formatZodFormError(err));
  }
}
