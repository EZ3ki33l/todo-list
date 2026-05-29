"use client";

import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@repo/api";
import { ShareTodoListPanel } from "@/components/share-todo-list-panel";
import { trpc } from "@/lib/trpc";

type TodoList = NonNullable<inferRouterOutputs<AppRouter>["lists"]["getById"]>;

export function TodoListShareHeader({
  listId,
  isOwner,
  isShared,
}: {
  listId: string;
  isOwner: boolean;
  isShared: boolean;
}) {
  const { data: list } = trpc.lists.getById.useQuery({ listId }, { enabled: isOwner });

  if (!isOwner || !list) return null;

  return (
    <div className="flex items-center gap-2">
      {isShared && (
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
          Partagée
        </span>
      )}
      <ShareTodoListPanel listId={listId} list={list as TodoList} />
    </div>
  );
}
