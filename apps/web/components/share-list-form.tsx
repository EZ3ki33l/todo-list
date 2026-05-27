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
        className="rounded px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-50 border border-indigo-200"
      >
        Partager
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-10 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
          <p className="mb-3 text-sm font-medium text-gray-800">Partager la liste</p>
          <form ref={formRef} action={handleSubmit} className="space-y-3">
            <input type="hidden" name="listId" value={listId} />

            <div>
              <label className="mb-1 block text-xs text-gray-500">
                Email ou ID de l&apos;utilisateur
              </label>
              <input
                type="text"
                name="emailOrId"
                required
                placeholder="email@exemple.com"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">Accès</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="invité"
                    defaultChecked
                    className="accent-indigo-600"
                  />
                  Peut voir
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="membre"
                    className="accent-indigo-600"
                  />
                  Peut modifier
                </label>
              </div>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
            {success && <p className="text-xs text-green-600">Liste partagée avec succès !</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 border border-gray-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded px-3 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500"
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
