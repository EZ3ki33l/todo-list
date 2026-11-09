import { ingredientTitleFromLine } from "./recipe-suggestions";
import type { MealDetail } from "./themealdb";
import { filterMeals, lookupMeal, searchMeals } from "./themealdb";
import {
  englishTermsForIngredient,
  normalizeMealQuery,
} from "./themealdb-fr";
import type { RecipeChatItemToAdd, RecipeChatMode, RecipeChatResult } from "./recipe-chat";

const MAX_INGREDIENT_FILTERS = 3;
const MAX_LOOKUPS = 6;
const MAX_MEALS = 3;

const PANTRY = new Set([
  "sel",
  "poivre",
  "huile",
  "eau",
  "vinaigre",
  "sucre",
  "salt",
  "pepper",
  "oil",
  "water",
  "vinegar",
  "sugar",
]);

const GENERIC_PROMPT_RE =
  /^(surprenez[-\s]?moi|des id[ée]es|surprise|ok|oui|vas[- ]y|propose(z)?([-\s]moi)?|un plat rapide|quelque chose de l[eé]ger|rapide|l[eé]ger|familial)$/i;

const SKIP_CATALOG_RE =
  /^(autre chose|pas [cç]a|autre(s)? (id[ée]es?|plats?)|encore( une? autre chose)?)$/i;

function normalizePrompt(text: string): string {
  return text
    .trim()
    .replace(/[!?…]+$/g, "")
    .trim();
}

export function isGenericChefPrompt(text: string): boolean {
  return GENERIC_PROMPT_RE.test(normalizePrompt(text));
}

export function skipCatalogForMessage(text: string): boolean {
  return SKIP_CATALOG_RE.test(normalizePrompt(text));
}

export function pickIngredientSearchTerms(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const line of lines) {
    const title = ingredientTitleFromLine(line);
    for (const term of englishTermsForIngredient(title)) {
      const key = normalizeMealQuery(term);
      if (!key || PANTRY.has(key) || seen.has(key)) continue;
      seen.add(key);
      out.push(term);
      if (out.length >= MAX_INGREDIENT_FILTERS) return out;
    }
  }

  return out;
}

function catalogIngredientOnList(mealTitle: string, listLines: string[]): boolean {
  const mealNorm = normalizeMealQuery(mealTitle);
  if (!mealNorm) return false;

  for (const line of listLines) {
    const title = ingredientTitleFromLine(line);
    const titleNorm = normalizeMealQuery(title);
    if (!titleNorm) continue;
    if (mealNorm.includes(titleNorm) || titleNorm.includes(mealNorm)) return true;
    for (const english of englishTermsForIngredient(title)) {
      const enNorm = normalizeMealQuery(english);
      if (enNorm && (mealNorm.includes(enNorm) || enNorm.includes(mealNorm))) return true;
    }
  }
  return false;
}

export function itemsToAddFromMeals(
  meals: MealDetail[],
  listLines: string[],
): RecipeChatItemToAdd[] {
  const seen = new Set<string>();
  const out: RecipeChatItemToAdd[] = [];

  for (const meal of meals) {
    for (const ingredient of meal.ingredients) {
      const title = ingredient.title.trim();
      const key = normalizeMealQuery(title);
      if (!key || seen.has(key) || PANTRY.has(key)) continue;
      if (catalogIngredientOnList(title, listLines)) continue;
      seen.add(key);
      out.push({
        title,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
      });
      if (out.length >= 8) return out;
    }
  }

  return out;
}

function formatIngredientLine(ingredient: MealDetail["ingredients"][number]): string {
  const qty = [ingredient.quantity, ingredient.unit].filter((v) => v != null && v !== "").join(" ");
  return qty ? `- ${ingredient.title} (${qty})` : `- ${ingredient.title}`;
}

export function formatCatalogChatReply(meals: MealDetail[]): string {
  const intro =
    meals.length === 1
      ? "Voici ce que j'ai trouvé dans TheMealDB :"
      : "Voici ce que j'ai trouvé dans TheMealDB, proche de votre demande :";

  const blocks = meals.map((meal, index) => {
    const ingredients = meal.ingredients.slice(0, 20).map(formatIngredientLine).join("\n");
    const steps = meal.steps
      .slice(0, 10)
      .map((step, stepIndex) => `${stepIndex + 1}. ${step}`)
      .join("\n");
    return `**${index + 1}. ${meal.title}**
📝 Ingrédients :
${ingredients}
👨‍🍳 Étapes :
${steps}`;
  });

  return [intro, ...blocks].join("\n\n");
}

function mealPageUrl(id: string): string {
  return `https://www.themealdb.com/meal.php?c=${encodeURIComponent(id)}`;
}

export async function findCatalogMealsForChat(params: {
  mode: Exclude<RecipeChatMode, "seasonal_produce">;
  ingredients: string[];
  userMessage: string;
}): Promise<MealDetail[]> {
  const scores = new Map<string, number>();
  const bump = (id: string, n: number) => scores.set(id, (scores.get(id) ?? 0) + n);

  const message = params.userMessage.trim();
  if (message && !isGenericChefPrompt(message)) {
    const found = await searchMeals(message);
    for (const meal of found.slice(0, 12)) bump(meal.id, 5);
  }

  if (params.mode === "from_list") {
    const terms = pickIngredientSearchTerms(params.ingredients);
    const filters = await Promise.all(
      terms.map(async (term) => filterMeals({ ingredient: term })),
    );
    for (const meals of filters) {
      for (const meal of meals.slice(0, 25)) bump(meal.id, 2);
    }
  }

  const ranked = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_LOOKUPS);

  if (ranked.length === 0) return [];

  const lookedUp = await Promise.all(ranked.map(([id]) => lookupMeal(id)));
  const details: MealDetail[] = [];
  for (const meal of lookedUp) {
    if (!meal || meal.ingredients.length === 0 || meal.steps.length === 0) continue;
    details.push(meal);
    if (details.length >= MAX_MEALS) break;
  }
  return details;
}

export async function chatResultFromCatalog(params: {
  mode: Exclude<RecipeChatMode, "seasonal_produce">;
  ingredients: string[];
  userMessage: string;
}): Promise<RecipeChatResult | null> {
  const meals = await findCatalogMealsForChat(params);
  if (meals.length === 0) return null;

  const sources = [
    { label: "TheMealDB", url: "https://www.themealdb.com" },
    ...meals.slice(0, 3).map((meal) => ({
      label: meal.title,
      url: meal.sourceUrl ?? mealPageUrl(meal.id),
    })),
  ].slice(0, 5);

  return {
    reply: formatCatalogChatReply(meals),
    sources,
    itemsToAdd: itemsToAddFromMeals(meals, params.ingredients),
  };
}
