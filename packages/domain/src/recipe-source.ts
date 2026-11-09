/** Origine d'une recette du carnet — doit suivre l'enum Prisma `RecipeSource`. */
export type RecipeSource = "MANUAL" | "CHEF_IA" | "MEALDB";

export type RecipeSourceBadge = {
  emoji: string;
  label: string;
};

/** `null` pour MANUAL : une recette saisie à la main n'affiche pas de badge. */
const BADGES: Record<RecipeSource, RecipeSourceBadge | null> = {
  MANUAL: null,
  CHEF_IA: { emoji: "👨‍🍳", label: "Chef IA" },
  MEALDB: { emoji: "🌍", label: "TheMealDB" },
};

export function recipeSourceBadge(source: string): RecipeSourceBadge | null {
  return BADGES[source as RecipeSource] ?? null;
}
