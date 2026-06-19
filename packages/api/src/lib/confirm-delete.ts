export function permanentDeleteMessage(label: string): string {
  return `Supprimer « ${label} » ? Cette suppression est définitive et ne pourra pas être annulée.`;
}

export function permanentBulkDeleteMessage(label: string): string {
  return `Supprimer ${label} ? Cette suppression est définitive et ne pourra pas être annulée.`;
}
