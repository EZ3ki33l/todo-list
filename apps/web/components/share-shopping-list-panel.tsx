"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";

import type { AppRouter } from "@repo/api";
import { trpc } from "@/lib/trpc";

type ShoppingList = NonNullable<
  inferRouterOutputs<AppRouter>["shoppingLists"]["getById"]
>;

type ShareRole = "membre" | "invité";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Une erreur est survenue";
}

export function ShareShoppingListPanel({
  listId,
  list,
}: {
  listId: string;
  list: ShoppingList;
}) {
  const [open, setOpen] = useState(false);
  const [emailOrId, setEmailOrId] = useState("");
  const [role, setRole] = useState<ShareRole>("invité");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const utils = trpc.useUtils();

  const refresh = () => {
    void utils.shoppingLists.getById.invalidate({ listId });
    void utils.shoppingLists.getAll.invalidate();
    void utils.shoppingItems.getListCatalog.invalidate({ listId });
  };

  const shareList = trpc.shoppingLists.share.useMutation({
    onSuccess: () => {
      refresh();
      setEmailOrId("");
      setSuccess(true);
      setError(null);
      setTimeout(() => setSuccess(false), 2000);
    },
    onError: (err) => {
      setSuccess(false);
      setError(errorMessage(err));
    },
  });

  const unshare = trpc.shoppingLists.unshare.useMutation({
    onSuccess: refresh,
    onError: (err) => setError(errorMessage(err)),
  });

  function handleShare(e: React.FormEvent) {
    e.preventDefault();
    const value = emailOrId.trim();
    if (!value) return;
    setError(null);
    setSuccess(false);
    shareList.mutate({ listId, emailOrId: value, role });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setError(null);
          setSuccess(false);
        }}
        className="rounded border border-indigo-200 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-50"
      >
        Partager
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-20 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
          <p className="mb-3 text-sm font-medium text-gray-800">Partager la liste</p>

          <form onSubmit={handleShare} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                Email ou ID de l&apos;utilisateur
              </label>
              <input
                type="text"
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                required
                placeholder="email@exemple.com"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">Accès</label>
              <div className="flex gap-2">
                {(["invité", "membre"] as ShareRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 rounded border px-2 py-1.5 text-xs ${
                      role === r
                        ? "border-indigo-600 bg-indigo-50 text-indigo-800"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {r === "membre" ? "Peut modifier" : "Peut voir"}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
            {success && (
              <p className="text-xs text-green-600">Liste partagée avec succès !</p>
            )}

            <button
              type="submit"
              disabled={!emailOrId.trim() || shareList.isPending}
              className="w-full rounded bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-500 disabled:opacity-40"
            >
              Ajouter
            </button>
          </form>

          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="mb-2 text-xs font-medium text-gray-500">Membres</p>
            <ul className="space-y-2">
              {list.owner && (
                <li className="text-sm text-gray-800">
                  {list.owner.name ?? list.owner.email}
                  <span className="ml-1 text-xs text-gray-400">(propriétaire)</span>
                </li>
              )}
              {list.members.map((m) => (
                <li key={m.userId} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-800">
                      {m.user.name ?? m.user.email}
                    </p>
                    <p className="text-xs text-gray-400">{m.role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => unshare.mutate({ listId, userId: m.userId })}
                    disabled={unshare.isPending}
                    className="shrink-0 text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
