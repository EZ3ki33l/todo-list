import { z } from "zod";

import {
  createActionInput,
  cuidSchema,
  createListInput,
  shareListInput,
  titleSchema,
  updateActionInput,
} from "./schemas";

function formString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value;
}

function formOptionalString(value: unknown): string | null | undefined {
  if (value === null) return undefined;
  if (typeof value !== "string") return undefined;
  return value;
}

export function parseCreateActionForm(formData: FormData) {
  const recurrenceDowRaw = formString(formData.get("recurrenceDow"));
  return createActionInput.parse({
    listId: formString(formData.get("listId")),
    title: formString(formData.get("title")),
    recurrence: formString(formData.get("recurrence")) ?? "NONE",
    recurrenceTime: formOptionalString(formData.get("recurrenceTime")),
    recurrenceDow:
      recurrenceDowRaw != null && recurrenceDowRaw !== ""
        ? Number.parseInt(recurrenceDowRaw, 10)
        : null,
    dueAt: formOptionalString(formData.get("dueAt")),
  });
}

export function parseUpdateActionForm(formData: FormData) {
  const recurrenceDowRaw = formString(formData.get("recurrenceDow"));
  return updateActionInput.parse({
    actionId: formString(formData.get("actionId")),
    title: formString(formData.get("title")),
    recurrence: formString(formData.get("recurrence")) ?? "NONE",
    recurrenceTime: formOptionalString(formData.get("recurrenceTime")),
    recurrenceDow:
      recurrenceDowRaw != null && recurrenceDowRaw !== ""
        ? Number.parseInt(recurrenceDowRaw, 10)
        : null,
    dueAt: formOptionalString(formData.get("dueAt")),
  });
}

export function parseCreateListForm(formData: FormData) {
  return createListInput.parse({
    title: formString(formData.get("title")),
  });
}

export function parseShareListForm(formData: FormData) {
  return shareListInput.parse({
    listId: formString(formData.get("listId")),
    emailOrId: formString(formData.get("emailOrId")),
    role: formString(formData.get("role")),
  });
}

export function parseListId(value: string) {
  return cuidSchema.parse(value);
}

export function parseActionId(value: string) {
  return cuidSchema.parse(value);
}

export function parseTitle(value: string) {
  return titleSchema.parse(value);
}

export function formatZodFormError(err: unknown): string {
  if (err instanceof z.ZodError) {
    return err.issues[0]?.message ?? "Données invalides";
  }
  if (err instanceof Error) return err.message;
  return "Données invalides";
}
