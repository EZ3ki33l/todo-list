"use client";

import { useState } from "react";

import { AddActionDetailModal } from "@/components/add-action-detail-modal";
import {
  clampDueTimeForDate,
  emptyActionDetailDraft,
  mergeScheduleWithDetailDraft,
  minDueDateInput,
  minDueTimeInput,
  toActionMutationFields,
  validateActionSchedule,
  type ActionDetailDraft,
} from "@repo/api/lib/action-form";
import type { ActionFormValues, RecurrenceKind } from "@repo/api/lib/action-form";
import { trpc } from "@/lib/trpc";

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

interface Props {
  listId: string;
}

function buildScheduleValues(
  title: string,
  recurrence: RecurrenceKind,
  dueDate: string,
  dueTime: string,
  recurrenceTime: string,
  recurrenceDow: number,
): ActionFormValues {
  return {
    title: title.trim(),
    recurrence,
    dueDate: recurrence === "NONE" ? dueDate || null : null,
    dueTime: recurrence === "NONE" ? dueTime || null : null,
    recurrenceTime: recurrence !== "NONE" ? recurrenceTime || null : null,
    recurrenceDow: recurrence === "WEEKLY" ? recurrenceDow : null,
  };
}

function resetSchedule(
  setters: {
    setTitle: (v: string) => void;
    setRecurrence: (v: RecurrenceKind) => void;
    setDueDate: (v: string) => void;
    setDueTime: (v: string) => void;
    setRecurrenceTime: (v: string) => void;
    setRecurrenceDow: (v: number) => void;
  },
) {
  setters.setTitle("");
  setters.setRecurrence("NONE");
  setters.setDueDate(minDueDateInput());
  setters.setDueTime("");
  setters.setRecurrenceTime("");
  setters.setRecurrenceDow(1);
}

export function AddActionForm({ listId }: Props) {
  const [title, setTitle] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceKind>("NONE");
  const [dueDate, setDueDate] = useState(() => minDueDateInput());
  const [dueTime, setDueTime] = useState("");
  const [recurrenceTime, setRecurrenceTime] = useState("");
  const [recurrenceDow, setRecurrenceDow] = useState(1);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDraft, setDetailDraft] = useState<ActionDetailDraft>(() =>
    emptyActionDetailDraft(),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const createAction = trpc.actions.create.useMutation({
    onMutate: async (input) => {
      setFormError(null);
      await utils.actions.getByList.cancel({ listId });
      const previous = utils.actions.getByList.getData({ listId });
      utils.actions.getByList.setData({ listId }, [
        ...(previous ?? []),
        {
          id: `optimistic-${Date.now()}`,
          listId,
          title: input.title,
          done: false,
          recurrence: input.recurrence,
          dueAt: input.dueAt,
          recurrenceTime: input.recurrenceTime ?? null,
          recurrenceDow: input.recurrenceDow ?? null,
          locationLabel: input.locationLabel ?? null,
          locationAddress: input.locationAddress ?? null,
          position: previous?.length ?? 0,
          streakCount: 0,
          bestStreak: 0,
          doneAt: null,
          lastStreakPeriod: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
      return { previous };
    },
    onError: (err, _input, context) => {
      if (context?.previous) {
        utils.actions.getByList.setData({ listId }, context.previous);
      }
      setFormError(err.message || "Impossible d'ajouter l'action.");
    },
    onSuccess: (result) => {
      resetSchedule({
        setTitle,
        setRecurrence,
        setDueDate,
        setDueTime,
        setRecurrenceTime,
        setRecurrenceDow,
      });
      setDetailOpen(false);
      setDetailDraft(emptyActionDetailDraft());
      if (result.googleCalendarWarning) {
        setFormError(
          `Action créée, mais Google Agenda : ${result.googleCalendarWarning}`,
        );
        return;
      }
      setFormError(null);
    },
    onSettled: () => {
      void utils.actions.getByList.invalidate({ listId });
    },
  });

  const schedule = buildScheduleValues(
    title,
    recurrence,
    dueDate,
    dueTime,
    recurrenceTime,
    recurrenceDow,
  );

  function handleDetailDraftChange(next: ActionDetailDraft) {
    setDetailDraft(next);
    if (recurrence === "NONE") {
      setDueDate(next.dueDate);
      setDueTime(next.dueTime);
    }
  }

  function openDetailModal() {
    setDetailDraft((prev) => ({
      ...prev,
      dueDate: dueDate || minDueDateInput(),
      dueTime,
    }));
    setDetailOpen(true);
  }

  function submitValues(values: ActionFormValues) {
    if (!values.title.trim()) return;
    const scheduleError = validateActionSchedule(values);
    if (scheduleError) {
      setFormError(scheduleError);
      return;
    }
    setFormError(null);
    createAction.mutate({
      listId,
      ...toActionMutationFields(values),
      addToGoogleCalendar: values.addToGoogleCalendar ?? false,
    });
  }

  function handleDueDateChange(value: string) {
    setDueDate(value);
    setDueTime((prev) => clampDueTimeForDate(value, prev));
  }

  const minTime = recurrence === "NONE" && dueTime ? minDueTimeInput(dueDate) : undefined;

  function handleAdd() {
    if (!title.trim()) return;
    submitValues(schedule);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <>
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nouvelle action..."
            className="flex-1 rounded-md border border-app-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/30"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!title.trim() || createAction.isPending}
            title="Ajouter"
            aria-label="Ajouter"
            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-app-primary text-xl font-bold text-app-on-primary hover:opacity-90 disabled:opacity-50"
          >
            {createAction.isPending ? "…" : "+"}
          </button>
          <button
            type="button"
            onClick={openDetailModal}
            disabled={!title.trim() || createAction.isPending}
            title="Ajouter avec lieu"
            aria-label="Ajouter avec lieu"
            className="flex h-10 shrink-0 items-center justify-center rounded-md border border-app-border bg-app-bg-elevated px-3 text-sm font-bold text-app-text hover:bg-app-bg-soft disabled:opacity-50"
          >
            ++
          </button>
        </div>

        {formError ? <p className="text-sm text-app-danger">{formError}</p> : null}

        <div className="flex flex-wrap gap-3 text-sm">
          {(["NONE", "DAILY", "WEEKLY"] as const).map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name={`recurrence-${listId}`}
                checked={recurrence === r}
                onChange={() => setRecurrence(r)}
                className="accent-app-primary"
              />
              {r === "NONE" && "Ponctuelle"}
              {r === "DAILY" && "Chaque jour"}
              {r === "WEEKLY" && "Chaque semaine"}
            </label>
          ))}
        </div>

        {recurrence === "NONE" && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="text-app-text-subtle whitespace-nowrap">À faire le</label>
            <input
              type="date"
              value={dueDate}
              required
              min={minDueDateInput()}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className="rounded border border-app-border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-app-primary/30"
            />
            <label className="text-app-text-subtle whitespace-nowrap">à (optionnel)</label>
            <input
              type="time"
              value={dueTime}
              min={minTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="rounded border border-app-border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-app-primary/30"
            />
          </div>
        )}

        {recurrence === "DAILY" && (
          <div className="flex items-center gap-2 text-sm">
            <label className="text-app-text-subtle whitespace-nowrap">À</label>
            <input
              type="time"
              value={recurrenceTime}
              onChange={(e) => setRecurrenceTime(e.target.value)}
              className="rounded border border-app-border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-app-primary/30"
            />
          </div>
        )}

        {recurrence === "WEEKLY" && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="text-app-text-subtle whitespace-nowrap">Chaque</label>
            <div className="flex gap-1">
              {DAYS.map((day, i) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setRecurrenceDow(i)}
                  className={`rounded px-2 py-1 text-xs border transition-colors ${
                    recurrenceDow === i
                      ? "border-app-primary bg-app-primary text-app-on-primary"
                      : "border-app-border-soft hover:bg-app-bg-soft"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            <label className="text-app-text-subtle whitespace-nowrap">à</label>
            <input
              type="time"
              value={recurrenceTime}
              onChange={(e) => setRecurrenceTime(e.target.value)}
              className="rounded border border-app-border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-app-primary/30"
            />
          </div>
        )}
      </div>

      <AddActionDetailModal
        open={detailOpen}
        schedule={schedule}
        draft={detailDraft}
        onDraftChange={handleDetailDraftChange}
        formError={formError}
        pending={createAction.isPending}
        onClose={() => setDetailOpen(false)}
        onSubmit={submitValues}
      />
    </>
  );
}
