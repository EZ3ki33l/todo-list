"use client";

import { useRef, useState } from "react";

import { trpc } from "@/lib/trpc";

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

interface Props {
  listId: string;
}

export function AddActionForm({ listId }: Props) {
  const [recurrence, setRecurrence] = useState<"NONE" | "DAILY" | "WEEKLY">("NONE");
  const formRef = useRef<HTMLFormElement>(null);
  const utils = trpc.useUtils();

  const createAction = trpc.actions.create.useMutation({
    onSuccess: () => {
      void utils.actions.getByList.invalidate({ listId });
      formRef.current?.reset();
      setRecurrence("NONE");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim();
    if (!title) return;

    const recurrenceValue = (fd.get("recurrence") as "NONE" | "DAILY" | "WEEKLY") || "NONE";
    const dueAtRaw = fd.get("dueAt");
    const recurrenceTimeRaw = fd.get("recurrenceTime");
    const recurrenceDowRaw = fd.get("recurrenceDow");

    createAction.mutate({
      listId,
      title,
      recurrence: recurrenceValue,
      dueAt:
        recurrenceValue === "NONE" && typeof dueAtRaw === "string" && dueAtRaw
          ? new Date(`${dueAtRaw}T12:00:00`).toISOString()
          : null,
      recurrenceTime:
        recurrenceValue !== "NONE" && typeof recurrenceTimeRaw === "string" && recurrenceTimeRaw
          ? recurrenceTimeRaw
          : null,
      recurrenceDow:
        recurrenceValue === "WEEKLY" && recurrenceDowRaw != null
          ? Number(recurrenceDowRaw)
          : null,
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mb-6 space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          name="title"
          required
          placeholder="Nouvelle action..."
          className="flex-1 rounded-md border border-app-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-border"
        />
        <button
          type="submit"
          disabled={createAction.isPending}
          className="rounded-md bg-app-primary px-4 py-2 text-sm text-app-on-primary hover:opacity-90 disabled:opacity-50"
        >
          Ajouter
        </button>
      </div>

      <div className="flex gap-3 text-sm">
        {(["NONE", "DAILY", "WEEKLY"] as const).map((r) => (
          <label key={r} className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name="recurrence"
              value={r}
              checked={recurrence === r}
              onChange={() => setRecurrence(r)}
              className="accent-app-text"
            />
            {r === "NONE" && "Ponctuelle"}
            {r === "DAILY" && "Chaque jour"}
            {r === "WEEKLY" && "Chaque semaine"}
          </label>
        ))}
      </div>

      {recurrence === "NONE" && (
        <div className="flex items-center gap-2 text-sm">
          <label className="text-app-text-subtle whitespace-nowrap">À faire le</label>
          <input
            type="date"
            name="dueAt"
            className="rounded border border-app-border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-app-border"
          />
        </div>
      )}

      {recurrence === "DAILY" && (
        <div className="flex items-center gap-2 text-sm">
          <label className="text-app-text-subtle whitespace-nowrap">À</label>
          <input
            type="time"
            name="recurrenceTime"
            className="rounded border border-app-border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-app-border"
          />
        </div>
      )}

      {recurrence === "WEEKLY" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="text-app-text-subtle whitespace-nowrap">Chaque</label>
          <div className="flex gap-1">
            {DAYS.map((day, i) => (
              <label key={i} className="flex cursor-pointer flex-col items-center">
                <input
                  type="radio"
                  name="recurrenceDow"
                  value={i}
                  defaultChecked={i === 1}
                  className="sr-only peer"
                />
                <span className="rounded px-2 py-1 text-xs border border-app-border-soft peer-checked:bg-app-primary peer-checked:text-app-on-primary peer-checked:border-app-primary hover:bg-app-bg-soft transition-colors">
                  {day}
                </span>
              </label>
            ))}
          </div>
          <label className="text-app-text-subtle whitespace-nowrap">à</label>
          <input
            type="time"
            name="recurrenceTime"
            className="rounded border border-app-border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-app-border"
          />
        </div>
      )}
    </form>
  );
}
