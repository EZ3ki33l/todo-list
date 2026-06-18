"use client";

import { useRef, useState } from "react";

import { shareTodoList } from "@/app/actions/todo-list";

interface Props {
  listId: string;
}

export function ShareListForm({ listId }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    try {
      await shareTodoList(formData);
      setSuccess(true);
      formRef.current?.reset();
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setError(null); setSuccess(false); }}
        className="rounded px-2 py-1 text-xs text-app-badge-text hover:bg-app-badge-bg border border-app-border-soft"
      >
        Partager
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-10 w-72 rounded-lg border border-app-border-soft bg-app-bg-elevated p-4 shadow-lg">
          <p className="mb-3 text-sm font-medium text-app-text">Partager la liste</p>
          <form ref={formRef} action={handleSubmit} className="space-y-3">
            <input type="hidden" name="listId" value={listId} />

            <div>
              <label className="mb-1 block text-xs text-app-text-subtle">
                Email ou ID de l&apos;utilisateur
              </label>
              <input
                type="text"
                name="emailOrId"
                required
                placeholder="email@exemple.com"
                className="w-full rounded border border-app-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-app-text-subtle">Accès</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="invité"
                    defaultChecked
                    className="accent-app-primary"
                  />
                  Peut voir
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="membre"
                    className="accent-app-primary"
                  />
                  Peut modifier
                </label>
              </div>
            </div>

            {error && <p className="text-xs text-app-danger">{error}</p>}
            {success && <p className="text-xs text-app-primary">Liste partagée avec succès !</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded px-3 py-1.5 text-xs text-app-text-muted hover:bg-app-bg-soft border border-app-border-soft"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded px-3 py-1.5 text-xs text-app-on-primary bg-app-primary hover:bg-app-primary"
              >
                Partager
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
