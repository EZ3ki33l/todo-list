"use client";

import { memo, useState, type FormEvent } from "react";
import Link from "next/link";

import { ActionToggleButton } from "@/components/action-toggle-button";
import { HydratableSvg } from "@/components/hydratable-svg";
import { useDeleteAction, useUpdateAction } from "@/lib/use-action-mutations";
import { useMounted } from "@/lib/use-mounted";

export type ActionItemData = {
  id: string;
  title: string;
  done: boolean;
  recurrence: string;
  recurrenceTime: string | null;
  recurrenceDow: number | null;
  dueAt: Date | string | null;
  streakCount: number;
  bestStreak: number;
  list: { id: string; title: string };
};

type ActionWithList = ActionItemData;

const DOW_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function toDateInputValue(date: Date | string | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

interface Props {
  action: ActionWithList;
  canEdit?: boolean;
  showListLink?: boolean;
  onChanged?: () => void;
  /** Dans ActionListPanel : évite un `<li>` dans un `<li>`. */
  embedded?: boolean;
  /** Masque le jour dans le badge hebdo (quand le jour est affiché dans un en-tête). */
  hideDayTag?: boolean;
}

function EditForm({
  action,
  onClose,
  onChanged,
}: {
  action: ActionWithList;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const listId = action.list.id;
  const update = useUpdateAction(listId);
  const [recurrence, setRecurrence] = useState<"NONE" | "DAILY" | "WEEKLY">(
    action.recurrence as "NONE" | "DAILY" | "WEEKLY",
  );

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    if (!title) return;

    const dueAtRaw = fd.get("dueAt");
    const recurrenceTimeRaw = fd.get("recurrenceTime");
    const recurrenceDowRaw = fd.get("recurrenceDow");

    update.mutate(
      {
        actionId: action.id,
        title,
        recurrence,
        dueAt:
          recurrence === "NONE" && typeof dueAtRaw === "string" && dueAtRaw
            ? new Date(`${dueAtRaw}T12:00:00`).toISOString()
            : null,
        recurrenceTime:
          recurrence !== "NONE" && typeof recurrenceTimeRaw === "string" && recurrenceTimeRaw
            ? recurrenceTimeRaw
            : null,
        recurrenceDow:
          recurrence === "WEEKLY" && typeof recurrenceDowRaw === "string" && recurrenceDowRaw !== ""
            ? Number(recurrenceDowRaw)
            : null,
      },
      {
        onSuccess: () => {
          onChanged?.();
          onClose();
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-1">
      <input
        type="text"
        name="title"
        required
        defaultValue={action.title}
        autoFocus
        className="w-full rounded border border-app-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary"
      />

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
            defaultValue={toDateInputValue(action.dueAt)}
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
            defaultValue={action.recurrenceTime ?? ""}
            className="rounded border border-app-border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-app-border"
          />
        </div>
      )}

      {recurrence === "WEEKLY" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="text-app-text-subtle whitespace-nowrap">Chaque</label>
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
            defaultValue={action.recurrenceTime ?? ""}
            className="rounded border border-app-border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-app-border"
          />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={update.isPending}
          className="rounded-md bg-app-primary px-3 py-1.5 text-xs text-app-on-primary hover:opacity-90 disabled:opacity-50"
        >
          Enregistrer
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-app-border-soft px-3 py-1.5 text-xs text-app-text-muted hover:bg-app-bg-soft"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

function ActionItemInner({
  action,
  canEdit = false,
  showListLink = true,
  onChanged,
  embedded = false,
  hideDayTag = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const deleteAction = useDeleteAction(action.list.id);
  const mounted = useMounted();

  const time = action.recurrenceTime
    ? action.recurrenceTime.slice(0, 5)
    : action.dueAt && mounted
      ? new Date(action.dueAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      : null;

  const className = "rounded-lg border border-app-border-soft bg-app-bg-elevated px-3 py-2.5 shadow-sm";

  const content = (
    <>
      {editing ? (
        <EditForm action={action} onClose={() => setEditing(false)} onChanged={onChanged} />
      ) : (
        <div className="flex items-start gap-3">
          <ActionToggleButton
            listId={action.list.id}
            actionId={action.id}
            done={action.done}
          />

          <div className="min-w-0 flex-1">
            <p className={`text-sm ${action.done ? "text-app-text-subtle line-through" : "text-app-text"}`}>
              {action.title}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              {time && <span className="text-xs text-app-text-subtle">{time}</span>}
              {showListLink && (
                <Link href={`/dashboard/lists/${action.list.id}`} className="text-xs text-app-primary hover:underline truncate">
                  {action.list.title}
                </Link>
              )}
              {action.recurrence === "DAILY" && (
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">quotidien</span>
              )}
              {action.recurrence === "WEEKLY" && !hideDayTag && (
                <span className="rounded bg-purple-50 px-1.5 py-0.5 text-xs text-purple-600">
                  hebdo · {action.recurrenceDow !== null ? DOW_LABELS[action.recurrenceDow!] : ""}
                </span>
              )}
              {action.recurrence === "WEEKLY" && hideDayTag && (
                <span className="rounded bg-purple-50 px-1.5 py-0.5 text-xs text-purple-600">hebdo</span>
              )}
              {action.recurrence !== "NONE" && action.streakCount > 0 && (
                <span className="rounded bg-orange-50 px-1.5 py-0.5 text-xs text-app-primary">
                  série {action.streakCount}
                  {action.bestStreak > action.streakCount ? ` · record ${action.bestStreak}` : ""}
                </span>
              )}
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Modifier"
                className="rounded p-1 text-app-border hover:text-app-primary transition-colors"
              >
                <HydratableSvg viewBox="0 0 16 16" className="size-4" fill="currentColor">
                  <path
                    d="M12.854 0.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3ZM9.793 2.5 1.5 10.793V14.5h3.707l8.293-8.293L9.793 2.5ZM1 15a.5.5 0 0 1 0-1h14a.5.5 0 0 1 0 1H1Z"
                    suppressHydrationWarning
                  />
                </HydratableSvg>
              </button>
              <button
                type="button"
                disabled={deleteAction.isPending}
                onClick={() => {
                  deleteAction.mutate(
                    { actionId: action.id },
                    { onSuccess: () => onChanged?.() },
                  );
                }}
                aria-label="Supprimer"
                className="rounded p-1 text-app-border hover:text-app-danger transition-colors disabled:opacity-40"
              >
                <HydratableSvg viewBox="0 0 16 16" className="size-4" fill="currentColor">
                  <path
                    d="M6.5 1h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1 0-1ZM3 4h10l-.867 9.143A1.5 1.5 0 0 1 10.637 14H5.363a1.5 1.5 0 0 1-1.496-1.357L3 4Zm2.5 2a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 1 0v-5a.5.5 0 0 0-.5-.5Zm3 0a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 1 0v-5a.5.5 0 0 0-.5-.5Z"
                    suppressHydrationWarning
                  />
                </HydratableSvg>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className={className}>{content}</div>;
  }

  return <li className={className}>{content}</li>;
}

function actionPropsEqual(prev: Props, next: Props): boolean {
  const a = prev.action;
  const b = next.action;
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.done === b.done &&
    a.recurrence === b.recurrence &&
    a.recurrenceTime === b.recurrenceTime &&
    a.recurrenceDow === b.recurrenceDow &&
    String(a.dueAt ?? "") === String(b.dueAt ?? "") &&
    a.streakCount === b.streakCount &&
    a.bestStreak === b.bestStreak &&
    a.list.id === b.list.id &&
    a.list.title === b.list.title &&
    prev.canEdit === next.canEdit &&
    prev.showListLink === next.showListLink &&
    prev.embedded === next.embedded &&
    prev.hideDayTag === next.hideDayTag &&
    prev.onChanged === next.onChanged
  );
}

export const ActionItem = memo(ActionItemInner, actionPropsEqual);
