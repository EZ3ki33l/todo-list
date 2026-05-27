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

function ListCard({ list, variant }: { list: TodoList; variant: "active" | "archived" | "done" }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <EditableTitle
        listId={list.id}
        initialTitle={list.title}
        href={`/dashboard/lists/${list.id}`}
      />
      <div className="flex items-center gap-2">
        {variant === "active" && (
          <>
            <form action={completeTodoList.bind(null, list.id)}>
              <button
                type="submit"
                className="rounded px-2 py-1 text-xs text-green-700 hover:bg-green-50 border border-green-200"
              >
                Terminer
              </button>
            </form>
            <form action={archiveTodoList.bind(null, list.id)}>
              <button
                type="submit"
                className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 border border-gray-200"
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
              className="rounded px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 border border-blue-200"
            >
              Restaurer
            </button>
          </form>
        )}
        <form action={deleteTodoList.bind(null, list.id)}>
          <button
            type="submit"
            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 border border-red-200"
          >
            Supprimer
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function TodoDashboard({ userId }: Props) {
  const [activeLists, archivedLists, doneLists] = await Promise.all([
    prisma.todoList.findMany({
      where: { ownerId: userId, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.todoList.findMany({
      where: { ownerId: userId, status: "ARCHIVED" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.todoList.findMany({
      where: { ownerId: userId, status: "DONE" },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Formulaire de création */}
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

      {/* Listes en cours */}
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
                <ListCard list={list} variant="active" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Listes archivées */}
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
                  <ListCard list={list} variant="archived" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      {/* Listes terminées */}
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
                  <ListCard list={list} variant="done" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </div>
  );
}
