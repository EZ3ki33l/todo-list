import Link from "next/link";
import { redirect } from "next/navigation";

import { withEffectiveDone } from "@repo/api";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@repo/api/server";
import { auth } from "@/auth";
import { prisma } from "@repo/db";
import { AddActionForm } from "@/components/add-action-form";
import { ActionListPanel } from "@/components/action-list-panel";
import { EditableTitle } from "@/components/editable-title";
import { TodoListShareHeader } from "@/components/todo-list-share-header";
import { getOrCreatePersonalTodoList } from "@/lib/default-lists";

type ActionRow = inferRouterOutputs<AppRouter>["actions"]["getByList"][number];

export default async function ListPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const personalTodo = await getOrCreatePersonalTodoList(userId);
  if (listId === personalTodo.id) redirect("/dashboard");

  const list = await prisma.todoList.findUnique({
    where: { id: listId },
    include: {
      actions: { orderBy: { position: "asc" } },
      members: { where: { userId } },
      _count: { select: { members: true } },
    },
  });

  if (!list) redirect("/dashboard");

  const isOwner = list.ownerId === userId;
  const membership = list.members[0];
  if (!isOwner && !membership) redirect("/dashboard");

  const canWrite = isOwner || membership?.role === "membre";
  const isShared = list._count.members > 0 || (!isOwner && !!membership);
  const now = new Date();
  const initialActions = list.actions.map((a) => withEffectiveDone(a, now));
  const total = initialActions.length;
  const done = initialActions.filter((a) => a.done).length;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Tâches
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {isOwner ? (
              <EditableTitle
                listId={list.id}
                initialTitle={list.title}
                className="text-2xl font-bold text-gray-900"
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">{list.title}</h1>
            )}
            {total > 0 && (
              <span className="text-sm text-gray-400">
                {done} / {total} fait{done > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {!canWrite && (
            <p className="mt-1 text-sm text-amber-700">Lecture seule (rôle invité)</p>
          )}
        </div>
        {isOwner && (
          <TodoListShareHeader listId={list.id} isOwner isShared={isShared} />
        )}
      </div>

      {canWrite && <AddActionForm listId={list.id} />}

      <ActionListPanel
        listId={list.id}
        listTitle={list.title}
        canEdit={canWrite}
        initialActions={initialActions as unknown as ActionRow[]}
      />
    </>
  );
}
