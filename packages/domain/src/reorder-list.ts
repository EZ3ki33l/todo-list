/** Réordonne les lignes selon `orderedIds` en conservant les objets existants. */
export function applyListOrder<T extends { id: string }>(
  rows: T[],
  orderedIds: string[],
): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return orderedIds
    .map((id) => byId.get(id))
    .filter((row): row is T => row != null);
}
