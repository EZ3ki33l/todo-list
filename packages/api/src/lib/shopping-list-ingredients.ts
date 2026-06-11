import { findAccessibleShoppingList } from "./shopping-list-access";

function formatIngredientLine(item: {
  title: string;
  quantity: number | null;
  unit: string | null;
}): string {
  const q =
    item.quantity != null
      ? ` ${item.quantity}${item.unit ? ` ${item.unit}` : ""}`
      : "";
  return `${item.title}${q}`.trim();
}

/** Articles non cochés de la liste, ou tous les articles si moins de 2 non cochés. */
export async function getShoppingListIngredientLines(
  listId: string,
  userId: string,
): Promise<string[]> {
  const list = await findAccessibleShoppingList(listId, userId, "read", {
    include: {
      items: {
        where: { checked: false },
        orderBy: { position: "asc" },
        select: { title: true, quantity: true, unit: true },
      },
    },
  });

  let lines = list.items.map(formatIngredientLine);

  if (lines.length < 2) {
    const all = await findAccessibleShoppingList(listId, userId, "read", {
      include: {
        items: {
          orderBy: { position: "asc" },
          select: { title: true, quantity: true, unit: true },
          take: 40,
        },
      },
    });
    lines = all.items.map(formatIngredientLine);
  }

  return lines.map((s) => s.trim()).filter(Boolean);
}
