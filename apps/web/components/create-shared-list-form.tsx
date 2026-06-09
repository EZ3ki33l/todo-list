"use client";

import { useState } from "react";

import { trpc } from "@/lib/trpc";

export function CreateSharedListForm({
  kind,
  placeholder,
}: {
  kind: "todo" | "shopping";
  placeholder: string;
}) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [open, setOpen] = useState(false);

  const createTodo = trpc.lists.create.useMutation({
    onSuccess: () => {
      setTitle("");
      setOpen(false);
      void utils.lists.getSharedTodos.invalidate();
      void utils.lists.getAll.invalidate();
    },
  });

  const createShopping = trpc.shoppingLists.create.useMutation({
    onSuccess: () => {
      setTitle("");
      setOpen(false);
      void utils.shoppingLists.getSharedShopping.invalidate();
      void utils.shoppingLists.getAll.invalidate();
    },
  });

  const pending = createTodo.isPending || createShopping.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    if (kind === "todo") createTodo.mutate({ title: t });
    else createShopping.mutate({ title: t });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-indigo-300 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
      >
        + Nouvelle liste partagée
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        required
        autoFocus
        className="min-w-[12rem] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <button
        type="submit"
        disabled={!title.trim() || pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-40"
      >
        Créer
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setTitle("");
        }}
        className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        Annuler
      </button>
    </form>
  );
}
