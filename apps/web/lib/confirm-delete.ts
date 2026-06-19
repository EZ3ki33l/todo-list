import {
  permanentBulkDeleteMessage,
  permanentDeleteMessage,
} from "@repo/api/lib/confirm-delete";

export function confirmPermanentDelete(label: string): boolean {
  return window.confirm(permanentDeleteMessage(label));
}

export function confirmPermanentBulkDelete(label: string): boolean {
  return window.confirm(permanentBulkDeleteMessage(label));
}
