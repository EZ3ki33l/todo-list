"use client";

import { useState } from "react";
import Link from "next/link";

import { deleteAction, toggleAction, updateAction } from "@/app/actions/action";
import type { Action } from "@repo/db";

type ActionWithList = Action & { list: { id: string; title: string } };

const DOW_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

interface Props {
  action: ActionWithList;
  canEdit?: boolean;
  showListLink?: boolean;
}

function EditForm({ action, onClose }: { action: ActionWithList; onClose: () => void }) {
  const [recurrence, setRecurrence] = useState<"NONE" | "DAILY" | "WEEKLY">(
    action.recurrence as "NONE" | "DAILY" | "WEEKLY",
  );

  async function handleSubmit(formData: FormData) {
    await updateAction(formData);
    onClose();
  }

  return (
    <form action={handleSubmit} className="space-y-3 pt-1">
      <input type="hidden" name="actionId" value={action.id} />

      {/* Titre */}
      <input
        type="text"
        name="title"
        required
        defaultValue={action.title}
        autoFocus
        className="w-full rounded border border-indigo-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />

      {/* Type */}
      <div className="flex gap-3 text-sm">
        {(["NONE", "DAILY", "WEEKLY"] as const).map((r) => (
          <label key={r} className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name="recurrence"
              value={r}
              checked={recurrence === r}
              onChange={() => setRecurrence(r)}
              className="accent-gray-800"
            />
            {r === "NONE" && "Ponctuelle"}
            {r === "DAILY" && "Chaque jour"}
            {r === "WEEKLY" && "Chaque semaine"}
          </label>
        ))}
      </div>

      {/* Date — NONE */}
      {recurrence === "NONE" && (
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-500 whitespace-nowrap">À faire le</label>
          <input
            type="date"
            name="dueAt"
            defaultValue={toDateInputValue(action.dueAt)}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
      )}

      {/* Heure — DAILY */}
      {recurrence === "DAILY" && (
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-500 whitespace-nowrap">À</label>
          <input
            type="time"
            name="recurrenceTime"
            defaultValue={action.recurrenceTime ?? ""}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
      )}

      {/* Jour + Heure — WEEKLY */}
      {recurrence === "WEEKLY" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="text-gray-500 whitespace-nowrap">Chaque</label>
          <div className="flex gap-1">
            {DOW_LABELS.map((day, i) => (
              <label key={i} className="flex cursor-pointer flex-col items-center">
                <input
                  type="radio"
                  name="recurrenceDow"
                  value={i}
                  defaultChecked={action.recurrenceDow === i}
                  className="sr-only peer"
                />
                <span className="rounded px-2 py-1 text-xs border border-gray-200 peer-checked:bg-gray-900 peer-checked:text-white peer-checked:border-gray-900 hover:bg-gray-100 transition-colors">
                  {day}
                </span>
              </label>
            ))}
          </div>
          <label className="text-gray-500 whitespace-nowrap">à</label>
          <input
            type="time"
            name="recurrenceTime"
            defaultValue={action.recurrenceTime ?? ""}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>
      )}

      {/* Boutons */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white hover:bg-gray-700"
        >
          Enregistrer
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

export function ActionItem({ action, canEdit = false, showListLink = true }: Props) {
  const [editing, setEditing] = useState(false);

  const time = action.recurrenceTime
    ? action.recurrenceTime.slice(0, 5)
    : action.dueAt
      ? new Date(action.dueAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      : null;

  return (
    <li className="rounded-lg border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
      {editing ? (
        <EditForm action={action} onClose={() => setEditing(false)} />
      ) : (
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <form action={toggleAction.bind(null, action.id)}>
            <button
              type="submit"
              aria-label={action.done ? "Marquer comme non fait" : "Marquer comme fait"}
              className={`mt-0.5 size-4 flex-shrink-0 rounded border-2 transition-colors ${
                action.done ? "border-green-500 bg-green-500" : "border-gray-300 hover:border-gray-400"
              }`}
            >
              {action.done && (
                <svg viewBox="0 0 12 12" className="size-full p-0.5">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              )}
            </button>
          </form>

          {/* Titre + méta */}
          <div className="min-w-0 flex-1">
            <p className={`text-sm ${action.done ? "text-gray-400 line-through" : "text-gray-800"}`}>
              {action.title}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              {time && <span className="text-xs text-gray-400">{time}</span>}
              {showListLink && (
                <Link href={`/dashboard/lists/${action.list.id}`} className="text-xs text-indigo-500 hover:underline truncate">
                  {action.list.title}
                </Link>
              )}
              {action.recurrence === "DAILY" && (
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">quotidien</span>
              )}
              {action.recurrence === "WEEKLY" && (
                <span className="rounded bg-purple-50 px-1.5 py-0.5 text-xs text-purple-600">
                  hebdo · {action.recurrenceDow !== null ? DOW_LABELS[action.recurrenceDow!] : ""}
                </span>
              )}
            </div>
          </div>

          {/* Boutons */}
          {canEdit && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Modifier"
                className="rounded p-1 text-gray-300 hover:text-indigo-500 transition-colors"
              >
                <svg viewBox="0 0 16 16" className="size-4" fill="currentColor">
                  <path d="M12.854 0.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3ZM9.793 2.5 1.5 10.793V14.5h3.707l8.293-8.293L9.793 2.5ZM1 15a.5.5 0 0 1 0-1h14a.5.5 0 0 1 0 1H1Z"/>
                </svg>
              </button>
              <form action={deleteAction.bind(null, action.id)}>
                <button
                  type="submit"
                  aria-label="Supprimer"
                  className="rounded p-1 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <svg viewBox="0 0 16 16" className="size-4" fill="currentColor">
                    <path d="M6.5 1h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1 0-1ZM3 4h10l-.867 9.143A1.5 1.5 0 0 1 10.637 14H5.363a1.5 1.5 0 0 1-1.496-1.357L3 4Zm2.5 2a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 1 0v-5a.5.5 0 0 0-.5-.5Zm3 0a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 1 0v-5a.5.5 0 0 0-.5-.5Z" />
                  </svg>
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
