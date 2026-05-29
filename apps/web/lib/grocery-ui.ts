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

export const PICKABLE_CATEGORIES: GroceryCategory[] = [
  "LEGUME",
  "FRUIT",
  "VIANDE",
  "POISSON",
  "BOULANGERIE",
  "EPICERIE",
  "LAITIER",
  "BOISSON",
  "HYGIENE",
  "AUTRE",
];

export function itemIcon(category: GroceryCategory, icon?: string | null): string {
  if (icon) return icon;
  return CATEGORY_ICONS[category];
}

/** Unités ; `null` = aucune (facultatif). */
export const SHOPPING_UNITS: { value: string | null; label: string }[] = [
  { value: null, label: "—" },
  { value: "kg", label: "kg" },
  { value: "L", label: "L" },
  { value: "pièce", label: "pièces" },
];
