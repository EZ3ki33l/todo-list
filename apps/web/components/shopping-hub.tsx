"use client";

import Link from "next/link";
import { useState } from "react";

import { TrashIcon } from "@/components/trash-icon";
import { trpc } from "@/lib/trpc";
import { confirmPermanentDelete } from "@/lib/confirm-delete";

interface Props {
  userId: string;
}

function ListActions({
  listId,
  title,
  status,
  isOwner,
  onMutate,
}: {
  listId: string;
  title: string;
  status: "ACTIVE" | "ARCHIVED" | "DONE";
  isOwner: boolean;
  onMutate: () => void;
}) {
  const updateStatus = trpc.shoppingLists.updateStatus.useMutation({ onSuccess: onMutate });
  const deleteList = trpc.shoppingLists.delete.useMutation({ onSuccess: onMutate });

  function handleDelete() {
    if (!confirmPermanentDelete(title)) return;
    deleteList.mutate({ listId });
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {status === "ACTIVE" && isOwner && (
        <>
          <button
            type="button"
            onClick={() => updateStatus.mutate({ listId, status: "DONE" })}
            disabled={updateStatus.isPending}
            className="rounded border border-app-border-soft px-2 py-1 text-xs text-app-primary hover:bg-green-50"
          >
            Terminer
          </button>
          <button
            type="button"
            onClick={() => updateStatus.mutate({ listId, status: "ARCHIVED" })}
            disabled={updateStatus.isPending}
            className="rounded border border-app-border-soft px-2 py-1 text-xs text-app-text-muted hover:bg-app-bg-soft"
          >
            Archiver
          </button>
        </>
      )}
      {(status === "ARCHIVED" || status === "DONE") && isOwner && (
        <button
          type="button"
          onClick={() => updateStatus.mutate({ listId, status: "ACTIVE" })}
          disabled={updateStatus.isPending}
          className="rounded border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
        >
          Restaurer
        </button>
      )}
      {isOwner && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteList.isPending}
          aria-label={`Supprimer la liste ${title}`}
          className="rounded border border-app-border-soft p-2 text-app-danger hover:bg-red-50 disabled:opacity-40"
        >
          <TrashIcon />
        </button>
      )}
    </div>
  );
}

function ListCard({
  list,
  userId,
  onMutate,
}: {
  list: {
    id: string;
    title: string;
    status: "ACTIVE" | "ARCHIVED" | "DONE";
    ownerId: string;
    _count: { items: number; members: number };
  };
  userId: string;
  onMutate: () => void;
}) {
  const isSharedWithMe = list.ownerId !== userId;
  const isShared =
    isSharedWithMe || list._count.members > 0;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-app-border-soft bg-app-bg-elevated px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/shopping/${list.id}`}
            className="font-medium text-app-text hover:underline"
          >
            {list.title}
          </Link>
          {isShared && (
            <span className="rounded-full bg-app-bg-soft px-2 py-0.5 text-xs text-app-text-muted">
              Partagée
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-app-text-subtle">
          {list._count.items} article{list._count.items !== 1 ? "s" : ""}
          {isSharedWithMe ? " · avec vous" : ""}
        </p>
      </div>
      <ListActions
        listId={list.id}
        title={list.title}
        status={list.status}
        isOwner={list.ownerId === userId}
        onMutate={onMutate}
      />
    </div>
  );
}

export function ShoppingHub({ userId }: Props) {
  const [newTitle, setNewTitle] = useState("");
  const utils = trpc.useUtils();
  const { data: lists, isLoading, refetch } = trpc.shoppingLists.getAll.useQuery();

  const refresh = () => void utils.shoppingLists.getAll.invalidate();

  const createList = trpc.shoppingLists.create.useMutation({
    onSuccess: () => {
      refresh();
      setNewTitle("");
    },
  });

  const activeLists = lists?.filter((l) => l.status === "ACTIVE") ?? [];
  const archivedLists = lists?.filter((l) => l.status === "ARCHIVED") ?? [];
  const doneLists = lists?.filter((l) => l.status === "DONE") ?? [];

  return (
    <div className="space-y-8">
      <section>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const title = newTitle.trim();
            if (title) createList.mutate({ title });
          }}
        >
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nouvelle liste de courses..."
            className="flex-1 rounded-md border border-app-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-border"
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || createList.isPending}
            className="rounded-md bg-app-primary px-4 py-2 text-sm text-app-on-primary hover:opacity-90 disabled:opacity-40"
          >
            Créer
          </button>
        </form>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-app-text">
            En cours{" "}
            <span className="text-sm font-normal text-app-text-subtle">({activeLists.length})</span>
          </h2>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-xs text-app-text-subtle hover:text-app-text"
          >
            Actualiser
          </button>
        </div>
        {isLoading ? (
          <p className="text-sm text-app-text-subtle">Chargement…</p>
        ) : activeLists.length === 0 ? (
          <p className="text-sm text-app-text-subtle">Aucune liste en cours.</p>
        ) : (
          <ul className="space-y-2">
            {activeLists.map((list) => (
              <li key={list.id}>
                <ListCard list={list} userId={userId} onMutate={refresh} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="group">
        <summary className="mb-3 cursor-pointer list-none text-lg font-semibold text-app-text select-none">
          <span className="flex items-center gap-2">
            <svg
              className="size-4 transition-transform group-open:rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Archivées
            <span className="text-sm font-normal text-app-text-subtle">({archivedLists.length})</span>
          </span>
        </summary>
        <div className="mt-3 space-y-2">
          {archivedLists.length === 0 ? (
            <p className="text-sm text-app-text-subtle">Aucune liste archivée.</p>
          ) : (
            archivedLists.map((list) => (
              <ListCard key={list.id} list={list} userId={userId} onMutate={refresh} />
            ))
          )}
        </div>
      </details>

      <details className="group">
        <summary className="mb-3 cursor-pointer list-none text-lg font-semibold text-app-text select-none">
          <span className="flex items-center gap-2">
            <svg
              className="size-4 transition-transform group-open:rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Terminées
            <span className="text-sm font-normal text-app-text-subtle">({doneLists.length})</span>
          </span>
        </summary>
        <div className="mt-3 space-y-2">
          {doneLists.length === 0 ? (
            <p className="text-sm text-app-text-subtle">Aucune liste terminée.</p>
          ) : (
            doneLists.map((list) => (
              <ListCard key={list.id} list={list} userId={userId} onMutate={refresh} />
            ))
          )}
        </div>
      </details>
    </div>
  );
}
