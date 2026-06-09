import { withEffectiveDone } from "@repo/api";
import { prisma } from "@repo/db";
import type { TodoList } from "@repo/db";

import {
  archiveTodoList,
  completeTodoList,
  createTodoList,
  deleteTodoList,
  restoreTodoList,
} from "@/app/actions/todo-list";
import { EditableTitle } from "@/components/editable-title";
import { ShareListForm } from "@/components/share-list-form";

interface Props {
  userId: string;
}

type ListWithCounts = TodoList & {
  _count: { members: number; actions: number };
  actions: {
    done: boolean;
    doneAt: Date | null;
    recurrence: string;
    recurrenceDow: number | null;
    updatedAt: Date;
  }[];
};

const listInclude = {
  _count: { select: { members: true, actions: true } },
  actions: {
    select: {
      done: true,
      doneAt: true,
      recurrence: true,
      recurrenceDow: true,
      updatedAt: true,
    },
  },
} as const;

function listProgress(list: ListWithCounts) {
  const total = list.actions.length;
  if (total === 0) return null;
  const done = list.actions.filter((a) =>
    withEffectiveDone({
      ...a,
      recurrence: a.recurrence as "NONE" | "DAILY" | "WEEKLY",
    }).done,
  ).length;
  return { done, total };
}

function listAccessWhere(userId: string) {
  return {
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };
}

function ListCard({
  list,
  userId,
  variant,
}: {
  list: ListWithCounts;
  userId: string;
  variant: "active" | "archived" | "done";
}) {
  const isOwner = list.ownerId === userId;
  const isSharedWithMe = !isOwner;
  const isShared = isSharedWithMe || list._count.members > 0;
  const progress = listProgress(list);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <EditableTitle
            listId={list.id}
            initialTitle={list.title}
            href={`/dashboard/lists/${list.id}`}
            readOnly={!isOwner}
          />
          {isShared && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              Partagée
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-gray-500">
          {progress ? (
            <>
              {progress.done} / {progress.total} fait{progress.done > 1 ? "s" : ""}
            </>
          ) : (
            <>Aucune action</>
          )}
          {isSharedWithMe ? " · avec vous" : ""}
        </p>
      </div>
      {isOwner && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {variant === "active" && (
            <>
              <form action={completeTodoList.bind(null, list.id)}>
                <button
                  type="submit"
                  className="rounded border border-green-200 px-2 py-1 text-xs text-green-700 hover:bg-green-50"
                >
                  Terminer
                </button>
              </form>
              <form action={archiveTodoList.bind(null, list.id)}>
                <button
                  type="submit"
                  className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                >
                  Archiver
                </button>
              </form>
              <ShareListForm listId={list.id} />
            </>
          )}
          {(variant === "archived" || variant === "done") && (
            <form action={restoreTodoList.bind(null, list.id)}>
              <button
                type="submit"
                className="rounded border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
              >
                Restaurer
              </button>
            </form>
          )}
          <form action={deleteTodoList.bind(null, list.id)}>
            <button
              type="submit"
              className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              Supprimer
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default async function TodoDashboard({ userId }: Props) {
  const access = listAccessWhere(userId);

  const [activeLists, archivedLists, doneLists] = await Promise.all([
    prisma.todoList.findMany({
      where: { ...access, status: "ACTIVE" },
      include: listInclude,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.todoList.findMany({
      where: { ...access, status: "ARCHIVED" },
      include: listInclude,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.todoList.findMany({
      where: { ...access, status: "DONE" },
      include: listInclude,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <form action={createTodoList} className="flex gap-2">
          <input
            type="text"
            name="title"
            required
            placeholder="Nouvelle liste..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
          >
            Créer
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Vos listes en cours{" "}
          <span className="text-sm font-normal text-gray-400">({activeLists.length})</span>
        </h2>
        {activeLists.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune liste en cours.</p>
        ) : (
          <ul className="space-y-2">
            {activeLists.map((list) => (
              <li key={list.id}>
                <ListCard list={list} userId={userId} variant="active" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="group">
        <summary className="mb-3 cursor-pointer list-none text-lg font-semibold text-gray-900 select-none">
          <span className="flex items-center gap-2">
            <svg
              className="size-4 transition-transform group-open:rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Listes archivées
            <span className="text-sm font-normal text-gray-400">({archivedLists.length})</span>
          </span>
        </summary>
        <div className="mt-3">
          {archivedLists.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune liste archivée.</p>
          ) : (
            <ul className="space-y-2">
              {archivedLists.map((list) => (
                <li key={list.id}>
                  <ListCard list={list} userId={userId} variant="archived" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      <details className="group">
        <summary className="mb-3 cursor-pointer list-none text-lg font-semibold text-gray-900 select-none">
          <span className="flex items-center gap-2">
            <svg
              className="size-4 transition-transform group-open:rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Listes terminées
            <span className="text-sm font-normal text-gray-400">({doneLists.length})</span>
          </span>
        </summary>
        <div className="mt-3">
          {doneLists.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune liste terminée.</p>
          ) : (
            <ul className="space-y-2">
              {doneLists.map((list) => (
                <li key={list.id}>
                  <ListCard list={list} userId={userId} variant="done" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </div>
  );
}
