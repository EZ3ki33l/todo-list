import { prisma } from "@repo/db";

import { normalizeItemTitle } from "./shopping-item-stat";

export type ListCatalogEntry = {
  title: string;
  titleNorm: string;
  category: string;
  useCount: number;
  lastUsedAt: Date;
};

/** Vocabulaire appris sur une liste (tous les membres), pour listes partagées. */
export async function getShoppingListCatalog(
  listId: string,
  limit = 32,
): Promise<ListCatalogEntry[]> {
  const rows = await prisma.shoppingItem.findMany({
    where: { listId },
    select: { title: true, category: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const map = new Map<string, ListCatalogEntry>();

  for (const row of rows) {
    const titleNorm = normalizeItemTitle(row.title);
    if (!titleNorm) continue;
    const existing = map.get(titleNorm);
    if (!existing) {
      map.set(titleNorm, {
        title: row.title.trim(),
        titleNorm,
        category: row.category,
        useCount: 1,
        lastUsedAt: row.createdAt,
      });
    } else {
      existing.useCount += 1;
      if (row.createdAt > existing.lastUsedAt) {
        existing.lastUsedAt = row.createdAt;
        existing.title = row.title.trim();
        existing.category = row.category;
      }
    }
  }

  return [...map.values()]
    .sort(
      (a, b) =>
        b.useCount - a.useCount ||
        b.lastUsedAt.getTime() - a.lastUsedAt.getTime(),
    )
    .slice(0, limit);
}
