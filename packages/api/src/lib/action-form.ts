export type RecurrenceKind = "NONE" | "DAILY" | "WEEKLY";

export const GOOGLE_CALENDAR_EVENTS_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";

export const REMINDER_PRESET_OPTIONS = [
  { id: "none", label: "Aucune", minutes: null },
  { id: "15m", label: "15 minutes avant", minutes: 15 },
  { id: "1h", label: "1 heure avant", minutes: 60 },
  { id: "1d", label: "1 jour avant", minutes: 60 * 24 },
  { id: "3d", label: "3 jours avant", minutes: 60 * 24 * 3 },
] as const;

export type ReminderPresetId = (typeof REMINDER_PRESET_OPTIONS)[number]["id"] | "custom";

export function resolveRemindBeforeMinutes(
  preset: ReminderPresetId,
  customAmount: number,
  customUnit: "hours" | "days",
): number | null {
  if (preset === "none") return null;
  if (preset === "custom") {
    if (!Number.isFinite(customAmount) || customAmount < 1) return null;
    return customUnit === "days" ? customAmount * 60 * 24 : customAmount * 60;
  }
  const option = REMINDER_PRESET_OPTIONS.find((row) => row.id === preset);
  return option?.minutes ?? null;
}

export type ActionFormValues = {
  title: string;
  recurrence: RecurrenceKind;
  dueDate?: string | null;
  dueTime?: string | null;
  recurrenceTime?: string | null;
  recurrenceDow?: number | null;
  locationLabel?: string | null;
  locationAddress?: string | null;
  notes?: string | null;
  remindBeforeMinutes?: number | null;
  addToGoogleCalendar?: boolean;
};

export function combineDueDateTime(dueDate: string, dueTime?: string | null): string {
  const [year, month, day] = dueDate.split("-").map(Number);
  let hours = 0;
  let minutes = 0;
  if (dueTime && /^\d{2}:\d{2}$/.test(dueTime)) {
    [hours, minutes] = dueTime.split(":").map(Number);
  }
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

/** Tâche ponctuelle sans heure saisie (minuit, ou midi = ancien défaut). */
export function isDateOnlyDueAt(dueAt: Date | string | null | undefined): boolean {
  if (!dueAt) return false;
  const d = new Date(dueAt);
  if (d.getMinutes() !== 0 || d.getSeconds() !== 0 || d.getMilliseconds() !== 0) return false;
  const h = d.getHours();
  return h === 0 || h === 12;
}

export function formatActionDueTime(
  dueAt: Date | string | null | undefined,
  locale = "fr-FR",
): string | null {
  if (!dueAt || isDateOnlyDueAt(dueAt)) return null;
  return new Date(dueAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function toLocalDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const PONCTUAL_DATE_REQUIRED =
  "La date est obligatoire pour une tâche ponctuelle.";
export const PONCTUAL_DATE_PAST =
  "La date ne peut pas être antérieure à aujourd'hui.";
export const PONCTUAL_DATETIME_PAST =
  "L'heure ne peut pas être antérieure à maintenant.";

export function minDueDateInput(now = new Date()): string {
  return toLocalDateInput(now);
}

/** Heure minimale si la date choisie est aujourd'hui (sinon `undefined`). */
export function minDueTimeInput(dueDate: string, now = new Date()): string | undefined {
  if (dueDate !== toLocalDateInput(now)) return undefined;
  return toTimeInputValue(now);
}

export function validateActionSchedule(
  values: ActionFormValues,
  now = new Date(),
): string | null {
  if (values.recurrence !== "NONE") return null;
  if (!values.dueDate?.trim()) return PONCTUAL_DATE_REQUIRED;
  const today = toLocalDateInput(now);
  if (values.dueDate < today) return PONCTUAL_DATE_PAST;
  if (values.dueTime?.trim()) {
    const dueAt = combineDueDateTime(values.dueDate, values.dueTime);
    if (new Date(dueAt).getTime() < now.getTime()) return PONCTUAL_DATETIME_PAST;
  }
  return null;
}

export function clampDueTimeForDate(dueDate: string, dueTime: string, now = new Date()): string {
  if (!dueTime.trim()) return dueTime;
  const minTime = minDueTimeInput(dueDate, now);
  if (minTime && dueTime < minTime) return minTime;
  return dueTime;
}
export function toActionMutationFields(values: ActionFormValues) {
  const title = values.title.trim();
  const recurrence = values.recurrence;

  return {
    title,
    recurrence,
    dueAt:
      recurrence === "NONE" && values.dueDate
        ? combineDueDateTime(values.dueDate, values.dueTime)
        : null,
    recurrenceTime:
      recurrence !== "NONE" && values.recurrenceTime ? values.recurrenceTime : null,
    recurrenceDow: recurrence === "WEEKLY" ? (values.recurrenceDow ?? null) : null,
    locationLabel: values.locationLabel?.trim() || null,
    locationAddress: values.locationAddress?.trim() || null,
    notes: values.notes?.trim() || null,
    remindBeforeMinutes: values.remindBeforeMinutes ?? null,
  };
}

export function toDateInputValue(date: Date | string | null | undefined) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function toTimeInputValue(date: Date | string | null | undefined) {
  if (!date || isDateOnlyDueAt(date)) return "";
  const d = new Date(date);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export type ActionDetailDraft = {
  locationLabel: string;
  locationAddress: string;
  notes: string;
  reminderPreset: ReminderPresetId;
  customAmount: string;
  customUnit: "hours" | "days";
  addToGoogleCalendar: boolean;
  dueDate: string;
  dueTime: string;
};

export function emptyActionDetailDraft(dueDate = minDueDateInput()): ActionDetailDraft {
  return {
    locationLabel: "",
    locationAddress: "",
    notes: "",
    reminderPreset: "none",
    customAmount: "1",
    customUnit: "hours",
    addToGoogleCalendar: false,
    dueDate,
    dueTime: "",
  };
}

export function mergeScheduleWithDetailDraft(
  schedule: ActionFormValues,
  draft: ActionDetailDraft,
): ActionFormValues {
  return {
    ...schedule,
    dueDate: schedule.recurrence === "NONE" ? draft.dueDate || null : schedule.dueDate,
    dueTime: schedule.recurrence === "NONE" ? draft.dueTime || null : schedule.dueTime,
    locationLabel: draft.locationLabel,
    locationAddress: draft.locationAddress,
    notes: draft.notes,
    remindBeforeMinutes: resolveRemindBeforeMinutes(
      draft.reminderPreset,
      Number(draft.customAmount),
      draft.customUnit,
    ),
    addToGoogleCalendar: draft.addToGoogleCalendar,
  };
}
