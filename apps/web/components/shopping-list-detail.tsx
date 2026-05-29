"use client";

import Link from "next/link";
import { useState } from "react";

import { trpc } from "@/lib/trpc";

interface Props {
  listId: string;
  userId: string;
}

export function ShoppingListDetail({ listId, userId }: Props) {
  const [title, setTitle] = useState("");
  const utils = trpc.useUtils();

  const { data: list } = trpc.shoppingLists.getById.useQuery({ listId });
  const { data: items, isLoading } = trpc.shoppingItems.getByList.useQuery({ listId });

  const isOwner = list?.ownerId === userId;
  const myMember = list?.members.find((m) => m.userId === userId);
  const canWrite = isOwner || myMember?.role === "membre";

  const invalidate = () => {
    void utils.shoppingItems.getByList.invalidate({ listId });
    void utils.shoppingLists.getAll.invalidate();
  };

  const createItem = trpc.shoppingItems.create.useMutation({
    onSuccess: () => {
      invalidate();
      setTitle("");
    },
  });

  const toggleItem = trpc.shoppingItems.toggle.useMutation({ onSuccess: invalidate });
  const deleteItem = trpc.shoppingItems.delete.useMutation({ onSuccess: invalidate });

  const unchecked = items?.filter((i) => !i.checked) ?? [];
  const checked = items?.filter((i) => i.checked) ?? [];

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t || !canWrite) return;
    createItem.mutate({ listId, title: t });
  }

  if (!list) {
    return <p className="text-sm text-gray-400">Chargement…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/shopping"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Mes courses
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{list.title}</h1>
        {!canWrite && (
          <p className="mt-1 text-sm text-amber-700">Lecture seule (rôle invité)</p>
        )}
      </div>

      {canWrite && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ajouter un article..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <button
            type="submit"
            disabled={!title.trim() || createItem.isPending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-40"
          >
            Ajouter
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Chargement…</p>
      ) : (
        <div className="space-y-6">
          <ItemSection
            label="À acheter"
            items={unchecked}
            canWrite={canWrite}
            onToggle={(id) => toggleItem.mutate({ itemId: id })}
            onDelete={(id) => deleteItem.mutate({ itemId: id })}
          />
          {checked.length > 0 && (
            <ItemSection
              label="Dans le panier"
              items={checked}
              canWrite={canWrite}
              onToggle={(id) => toggleItem.mutate({ itemId: id })}
              onDelete={(id) => deleteItem.mutate({ itemId: id })}
              muted
            />
          )}
          {unchecked.length === 0 && checked.length === 0 && (
            <p className="text-sm text-gray-400">Liste vide.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ItemSection({
  label,
  items,
  canWrite,
  onToggle,
  onDelete,
  muted,
}: {
  label: string;
  items: { id: string; title: string; quantity: number | null; unit: string | null; checked: boolean }[];
  canWrite: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  muted?: boolean;
}) {
  return (
    <section>
      <h2 className={`mb-2 text-sm font-semibold ${muted ? "text-gray-400" : "text-gray-700"}`}>
        {label} ({items.length})
      </h2>
      <ul className="space-y-1">
        {items.map((item) => {
          const qty =
            item.quantity != null
              ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""} `
              : "";
          return (
            <li
              key={item.id}
              className={`flex items-center gap-3 rounded-md border border-gray-100 px-3 py-2 ${
                muted ? "bg-gray-50 opacity-75" : "bg-white"
              }`}
            >
              <input
                type="checkbox"
                checked={item.checked}
                disabled={!canWrite}
                onChange={() => onToggle(item.id)}
                className="size-4 rounded border-gray-300"
              />
              <span
                className={`flex-1 text-sm ${item.checked ? "text-gray-400 line-through" : "text-gray-900"}`}
              >
                {qty}
                {item.title}
              </span>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                  aria-label="Supprimer"
                >
                  ✕
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
