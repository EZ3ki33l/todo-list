import { prisma } from "@repo/db";

/** Même normalisation que l'app native (grocery-detect). */
export function normalizeItemTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, " ")
    .trim();
}

export async function recordShoppingItemStat(
  userId: string,
  item: {
    title: string;
    category: string;
    quantity?: number | null;
    unit?: string | null;
  },
): Promise<void> {
  const titleNorm = normalizeItemTitle(item.title);
  if (!titleNorm) return;

  const displayTitle = item.title.trim();

  await prisma.shoppingItemStat.upsert({
    where: { userId_titleNorm: { userId, titleNorm } },
    create: {
      userId,
      titleNorm,
      title: displayTitle,
      category: item.category as never,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      useCount: 1,
      lastUsedAt: new Date(),
    },
    update: {
      title: displayTitle,
      category: item.category as never,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      useCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });
}

export async function getFrequentShoppingItems(
  userId: string,
  options?: { limit?: number; minUseCount?: number },
) {
  const limit = options?.limit ?? 12;
  const minUseCount = options?.minUseCount ?? 2;

  return prisma.shoppingItemStat.findMany({
    where: { userId, useCount: { gte: minUseCount } },
    orderBy: [{ useCount: "desc" }, { lastUsedAt: "desc" }],
    take: limit,
    select: {
      title: true,
      titleNorm: true,
      category: true,
      quantity: true,
      unit: true,
      useCount: true,
      lastUsedAt: true,
    },
  });
}
