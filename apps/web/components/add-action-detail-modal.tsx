"use client";

import { useUser } from "@clerk/nextjs";

import { buildMapsSearchUrl, resolveMapsQuery } from "@repo/api/lib/maps";
import {
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  REMINDER_PRESET_OPTIONS,
  clampDueTimeForDate,
  minDueDateInput,
  minDueTimeInput,
  mergeScheduleWithDetailDraft,
  type ActionDetailDraft,
  type ActionFormValues,
  type ReminderPresetId,
} from "@repo/api/lib/action-form";
import { trpc } from "@/lib/trpc";

type Props = {
  open: boolean;
  schedule: ActionFormValues;
  draft: ActionDetailDraft;
  onDraftChange: (draft: ActionDetailDraft) => void;
  pending?: boolean;
  formError?: string | null;
  onClose: () => void;
  onSubmit: (values: ActionFormValues) => void;
};

export function AddActionDetailModal({
  open,
  schedule,
  draft,
  onDraftChange,
  pending = false,
  formError = null,
  onClose,
  onSubmit,
}: Props) {
  const { user, isLoaded } = useUser();
  const hasGoogle =
    isLoaded &&
    (user?.externalAccounts?.some(
      (account) => account.provider === "google",
    ) ??
      false);
  const { data: googleCalendarStatus } = trpc.auth.googleCalendarStatus.useQuery(undefined, {
    enabled: hasGoogle,
  });
  const googleCalendarReady =
    (googleCalendarStatus?.hasToken && googleCalendarStatus?.hasCalendarScope) ?? false;

  if (!open) return null;

  const mapsQuery = resolveMapsQuery(draft.locationLabel, draft.locationAddress);
  const minTime =
    schedule.recurrence === "NONE" && draft.dueTime
      ? minDueTimeInput(draft.dueDate)
      : undefined;

  function patchDraft(patch: Partial<ActionDetailDraft>) {
    onDraftChange({ ...draft, ...patch });
  }

  function handleDueDateChange(value: string) {
    patchDraft({
      dueDate: value,
      dueTime: clampDueTimeForDate(value, draft.dueTime),
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schedule.title.trim()) return;
    onSubmit(mergeScheduleWithDetailDraft(schedule, draft));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-app-overlay p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-action-detail-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-app-border-soft bg-app-bg-elevated p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 id="add-action-detail-title" className="text-lg font-semibold text-app-text">
          Détails de l&apos;action
        </h2>
        <p className="mt-1 text-sm text-app-text-muted">
          Options facultatives pour « {schedule.title} ».
        </p>

        {schedule.recurrence === "NONE" ? (
          <section className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
              Planification
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="text-app-text-subtle whitespace-nowrap">À faire le</label>
              <input
                type="date"
                required
                min={minDueDateInput()}
                value={draft.dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className="rounded border border-app-border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-app-primary/30"
              />
              <label className="text-app-text-subtle whitespace-nowrap">à (optionnel)</label>
              <input
                type="time"
                value={draft.dueTime}
                min={minTime}
                onChange={(e) => patchDraft({ dueTime: e.target.value })}
                className="rounded border border-app-border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-app-primary/30"
              />
            </div>
          </section>
        ) : null}

        <section className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">Lieu</p>
          <input
            type="text"
            value={draft.locationLabel}
            onChange={(e) => patchDraft({ locationLabel: e.target.value })}
            placeholder="Nom du lieu"
            className="w-full rounded-md border border-app-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/30"
          />
          <input
            type="text"
            value={draft.locationAddress}
            onChange={(e) => patchDraft({ locationAddress: e.target.value })}
            placeholder="Adresse"
            className="w-full rounded-md border border-app-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/30"
          />
          {mapsQuery ? (
            <a
              href={buildMapsSearchUrl(mapsQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-semibold text-app-primary hover:underline"
            >
              S&apos;y rendre
            </a>
          ) : null}
        </section>

        <section className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">Notes</p>
          <textarea
            value={draft.notes}
            onChange={(e) => patchDraft({ notes: e.target.value })}
            placeholder="Notes libres…"
            rows={3}
            className="w-full resize-y rounded-md border border-app-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/30"
          />
        </section>

        <section className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">Alerte</p>
          <select
            value={draft.reminderPreset}
            onChange={(e) =>
              patchDraft({ reminderPreset: e.target.value as ReminderPresetId })
            }
            className="w-full rounded-md border border-app-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/30"
          >
            {REMINDER_PRESET_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
            <option value="custom">Personnalisé…</option>
          </select>
          {draft.reminderPreset === "custom" ? (
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={30}
                value={draft.customAmount}
                onChange={(e) => patchDraft({ customAmount: e.target.value })}
                className="w-20 rounded-md border border-app-border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/30"
              />
              <select
                value={draft.customUnit}
                onChange={(e) =>
                  patchDraft({ customUnit: e.target.value as "hours" | "days" })
                }
                className="flex-1 rounded-md border border-app-border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-primary/30"
              >
                <option value="hours">heure(s) avant</option>
                <option value="days">jour(s) avant</option>
              </select>
            </div>
          ) : null}
          <p className="text-xs text-app-text-subtle">
            Notification navigateur sur PC, alerte système sur mobile.
          </p>
        </section>

        {hasGoogle ? (
          <section className="mt-4 space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-app-text">
              <input
                type="checkbox"
                checked={draft.addToGoogleCalendar}
                onChange={(e) => patchDraft({ addToGoogleCalendar: e.target.checked })}
                className="accent-app-primary"
              />
              Ajouter à Google Agenda
            </label>
            {!googleCalendarReady ? (
              <p className="text-xs text-app-text-subtle">
                {googleCalendarStatus?.hasToken === false ? (
                  <>
                    Jeton Google indisponible — reconnectez Google depuis votre profil Clerk.
                  </>
                ) : googleCalendarStatus?.hasCalendarScope === false ? (
                  <>
                    Le jeton actuel n&apos;a pas l&apos;accès Agenda. Reconnectez Google après
                    avoir ajouté le scope{" "}
                    <code className="text-[11px]">{GOOGLE_CALENDAR_EVENTS_SCOPE}</code> dans Clerk.
                  </>
                ) : (
                  <>
                    Avec des credentials Google personnalisées, activez aussi l&apos;API{" "}
                    <strong>Google Calendar</strong> dans la console Google Cloud du même projet
                    OAuth.
                  </>
                )}
              </p>
            ) : null}
          </section>
        ) : null}

        {formError ? <p className="mt-3 text-sm text-app-danger">{formError}</p> : null}

        <div className="mt-5 flex gap-2">
          <button
            type="submit"
            disabled={pending || !schedule.title.trim()}
            className="flex-1 rounded-lg bg-app-primary px-4 py-2.5 text-sm font-semibold text-app-on-primary disabled:opacity-50"
          >
            {pending ? "Ajout…" : "Ajouter"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-app-border px-4 py-2.5 text-sm font-semibold text-app-text-muted hover:bg-app-bg-soft"
          >
            Fermer
          </button>
        </div>
      </form>
    </div>
  );
}
