import type { GroceryCategory } from "./grocery-detect";

export const CATEGORY_LABELS: Record<GroceryCategory, string> = {
  LEGUME: "Légumes",
  FRUIT: "Fruits",
  VIANDE: "Viande",
  POISSON: "Poisson",
  BOULANGERIE: "Boulangerie",
  EPICERIE: "Épicerie",
  LAITIER: "Laitier",
  BOISSON: "Boissons",
  HYGIENE: "Hygiène",
  AUTRE: "Autre",
};

const CATEGORY_ICONS: Record<GroceryCategory, string> = {
  LEGUME: "🥬",
  FRUIT: "🍎",
  VIANDE: "🥩",
  POISSON: "🐟",
  BOULANGERIE: "🥖",
  EPICERIE: "🫙",
  LAITIER: "🥛",
  BOISSON: "🥤",
  HYGIENE: "🧴",
  AUTRE: "📦",
};

export function itemIcon(category: GroceryCategory, icon?: string | null): string {
  if (icon) return icon;
  return CATEGORY_ICONS[category];
}
