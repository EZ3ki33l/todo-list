import { detectCategory, type GroceryCategory } from "@repo/domain/grocery-detect";
import { parseChefMessage, type ParsedRecipe } from "@repo/domain/chef-message";
import { parseQuantity } from "@repo/domain/shopping-quantity";

export type RecipeDraftIngredient = {
  title: string;
  quantity: number | null;
  unit: string | null;
  category: GroceryCategory;
};

export type RecipeDraft = {
  title: string;
  timeLabel: string | null;
  servings: number | null;
  notes: string | null;
  ingredients: RecipeDraftIngredient[];
  steps: string[];
};

/** Unités reconnues en tête de ligne d'ingrédient (« 200 g de farine »). */
const UNIT_PATTERN = /^(\d+(?:[.,]\d+)?)\s*(kg|g|l|cl|ml|cs|cc|pinc[ée]es?|gousses?|tranches?|pi[èe]ces?)?\b\s*(?:de\s+|d'\s*)?/i;

/**
 * « 200 g de farine » → { title: "farine", quantity: 200, unit: "g" }.
 * Une ligne sans quantité reconnaissable est gardée telle quelle.
 */
export function parseIngredientLine(line: string): RecipeDraftIngredient {
  const text = line.trim();
  const match = UNIT_PATTERN.exec(text);

  let title = text;
  let quantity: number | null = null;
  let unit: string | null = null;

  if (match) {
    const rest = text.slice(match[0].length).trim();
    // Sans reste, « 3 œufs » : le nombre est la quantité, le mot reste le titre.
    if (rest) {
      quantity = parseQuantity(match[1] ?? "");
      unit = match[2]?.toLowerCase() ?? null;
      title = rest;
    }
  }

  return {
    title: title || text,
    quantity,
    unit,
    category: detectCategory(title || text) ?? "AUTRE",
  };
}

/** Extrait le nombre de parts d'un intitulé libre (« Pour 4 personnes »). */
export function parseServings(text: string | undefined): number | null {
  if (!text) return null;
  const match = /(\d{1,2})\s*(?:personnes?|parts?|convives?)/i.exec(text);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isInteger(n) && n >= 1 && n <= 100 ? n : null;
}

export function recipeDraftFromParsed(recipe: ParsedRecipe): RecipeDraft {
  const ingredients = recipe.sections
    .filter((s) => s.kind === "ingredients")
    .flatMap((s) => s.items);
  const steps = recipe.sections.filter((s) => s.kind === "steps").flatMap((s) => s.items);

  return {
    title: recipe.title,
    timeLabel: recipe.time ?? null,
    servings: parseServings(recipe.time) ?? parseServings(recipe.intro),
    notes: recipe.intro ?? null,
    ingredients: ingredients.map(parseIngredientLine),
    steps,
  };
}

/**
 * Analyse une réponse du Chef IA et retourne la recette demandée.
 * `null` si le message n'en contient aucune à cet index.
 */
export function recipeDraftFromChatMessage(
  messageText: string,
  recipeIndex = 0,
): RecipeDraft | null {
  const parsed = parseChefMessage(messageText);
  const recipe = parsed.recipes[recipeIndex];
  return recipe ? recipeDraftFromParsed(recipe) : null;
}
