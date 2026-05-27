"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@repo/db";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  return session.user.id;
}

async function assertListOwner(listId: string, userId: string) {
  const list = await prisma.todoList.findUnique({ where: { id: listId } });
  if (!list || list.ownerId !== userId) throw new Error("Accès refusé");
  return list;
}

export async function createTodoList(formData: FormData) {
  const userId = await requireSession();
  const title = (formData.get("title") as string | null)?.trim();
  if (!title) throw new Error("Le titre est requis");

  await prisma.todoList.create({
    data: { title, ownerId: userId },
  });

  revalidatePath("/dashboard");
}

export async function archiveTodoList(listId: string) {
  const userId = await requireSession();
  await assertListOwner(listId, userId);

  await prisma.todoList.update({
    where: { id: listId },
    data: { status: "ARCHIVED" },
  });

  revalidatePath("/dashboard");
}

export async function completeTodoList(listId: string) {
  const userId = await requireSession();
  await assertListOwner(listId, userId);

  await prisma.todoList.update({
    where: { id: listId },
    data: { status: "DONE" },
  });

  revalidatePath("/dashboard");
}

export async function restoreTodoList(listId: string) {
  const userId = await requireSession();
  await assertListOwner(listId, userId);

  await prisma.todoList.update({
    where: { id: listId },
    data: { status: "ACTIVE" },
  });

  revalidatePath("/dashboard");
}

export async function deleteTodoList(listId: string) {
  const userId = await requireSession();
  await assertListOwner(listId, userId);

  await prisma.todoList.delete({ where: { id: listId } });

  revalidatePath("/dashboard");
}

export async function renameTodoList(listId: string, title: string) {
  const userId = await requireSession();
  await assertListOwner(listId, userId);

  const trimmed = title.trim();
  if (!trimmed) throw new Error("Le titre ne peut pas être vide");

  await prisma.todoList.update({
    where: { id: listId },
    data: { title: trimmed },
  });

  revalidatePath("/dashboard");
}

export async function shareTodoList(formData: FormData) {
  const userId = await requireSession();
  const listId = formData.get("listId") as string;
  const emailOrId = (formData.get("emailOrId") as string)?.trim();
  const role = formData.get("role") as "membre" | "invité";

  if (!listId || !emailOrId || !role) throw new Error("Paramètres manquants");

  await assertListOwner(listId, userId);

  const target = await prisma.user.findFirst({
    where: { OR: [{ email: emailOrId }, { id: emailOrId }] },
  });

  if (!target) throw new Error("Utilisateur introuvable");
  if (target.id === userId) throw new Error("Vous ne pouvez pas partager une liste avec vous-même");

  await prisma.todoListMember.upsert({
    where: { listId_userId: { listId, userId: target.id } },
    update: { role },
    create: { listId, userId: target.id, role },
  });

  revalidatePath("/dashboard");
}
