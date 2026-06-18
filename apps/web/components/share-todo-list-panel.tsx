"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";

import type { AppRouter } from "@repo/api/server";
import { trpc } from "@/lib/trpc";

type TodoList = NonNullable<inferRouterOutputs<AppRouter>["lists"]["getById"]>;

type ShareRole = "membre" | "invité";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Une erreur est survenue";
}

export function ShareTodoListPanel({
  listId,
  list,
}: {
  listId: string;
  list: TodoList;
}) {
  const [open, setOpen] = useState(false);
  const [emailOrId, setEmailOrId] = useState("");
  const [role, setRole] = useState<ShareRole>("invité");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const utils = trpc.useUtils();

  const refresh = () => {
    void utils.lists.getById.invalidate({ listId });
    void utils.lists.getAll.invalidate();
  };

  const shareList = trpc.lists.share.useMutation({
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

  const unshare = trpc.lists.unshare.useMutation({
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
        className="rounded border border-app-border-soft px-2 py-1 text-xs text-app-badge-text hover:bg-app-badge-bg"
      >
        Partager
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-20 w-80 rounded-lg border border-app-border-soft bg-app-bg-elevated p-4 shadow-lg">
          <p className="mb-3 text-sm font-medium text-app-text">Partager la liste</p>

          <form onSubmit={handleShare} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-app-text-subtle">
                Email ou ID de l&apos;utilisateur
              </label>
              <input
                type="text"
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                required
                placeholder="email@exemple.com"
                className="w-full rounded border border-app-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-app-text-subtle">Accès</label>
              <div className="flex gap-2">
                {(["invité", "membre"] as ShareRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 rounded border px-2 py-1.5 text-xs ${
                      role === r
                        ? "border-app-primary bg-app-badge-bg text-app-badge-text"
                        : "border-app-border-soft text-app-text-muted hover:bg-app-bg-soft"
                    }`}
                  >
                    {r === "membre" ? "Peut modifier" : "Peut voir"}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-app-danger">{error}</p>}
            {success && (
              <p className="text-xs text-app-primary">Liste partagée avec succès !</p>
            )}

            <button
              type="submit"
              disabled={!emailOrId.trim() || shareList.isPending}
              className="w-full rounded bg-app-primary px-3 py-1.5 text-xs text-app-on-primary hover:bg-app-primary disabled:opacity-40"
            >
              Ajouter
            </button>
          </form>

          <div className="mt-4 border-t border-app-border-soft pt-3">
            <p className="mb-2 text-xs font-medium text-app-text-subtle">Membres</p>
            <ul className="space-y-2">
              {list.owner && (
                <li className="text-sm text-app-text">
                  {list.owner.name ?? list.owner.email}
                  <span className="ml-1 text-xs text-app-text-subtle">(propriétaire)</span>
                </li>
              )}
              {list.members.map((m) => (
                <li key={m.userId} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-app-text">
                      {m.user.name ?? m.user.email}
                    </p>
                    <p className="text-xs text-app-text-subtle">{m.role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => unshare.mutate({ listId, userId: m.userId })}
                    disabled={unshare.isPending}
                    className="shrink-0 text-xs text-app-danger hover:text-app-danger disabled:opacity-40"
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
              className="rounded border border-app-border-soft px-3 py-1.5 text-xs text-app-text-muted hover:bg-app-bg-soft"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
