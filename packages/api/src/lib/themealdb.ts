import { detectCategory, type GroceryCategory } from "@repo/domain/grocery-detect";
import { parseQuantity } from "@repo/domain/shopping-quantity";

import { applyFrenchToDetail, applyFrenchToSummaries } from "./meal-translation";
import type { RecipeDraft, RecipeDraftIngredient } from "./recipe-from-chat";
import {
  expandMealSearchQueries,
  frenchQueryArea,
  frenchQueryCategory,
  frenchQueryIngredient,
  titleMatchesWholeQuery,
} from "./themealdb-fr";

const FETCH_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 60 * 60 * 1000;
const FILTERS_TTL_MS = 24 * 60 * 60 * 1000;

export const MEAL_CATEGORY_LABELS: Record<string, string> = {
  Beef: "Bœuf",
  Breakfast: "Petit-déjeuner",
  Chicken: "Poulet",
  Dessert: "Dessert",
  Goat: "Chèvre",
  Lamb: "Agneau",
  Miscellaneous: "Divers",
  Pasta: "Pâtes",
  Pork: "Porc",
  Seafood: "Fruits de mer",
  Side: "Accompagnement",
  Starter: "Entrée",
  Vegan: "Végan",
  Vegetarian: "Végétarien",
};

export const MEAL_AREA_LABELS: Record<string, string> = {
  American: "Américaine",
  "United States": "Américaine",
  British: "Britannique",
  "United Kingdom": "Britannique",
  Canadian: "Canadienne",
  Canada: "Canadienne",
  Chinese: "Chinoise",
  China: "Chinoise",
  Croatian: "Croate",
  Croatia: "Croate",
  Dutch: "Néerlandaise",
  Netherlands: "Néerlandaise",
  Egyptian: "Égyptienne",
  Egypt: "Égyptienne",
  Filipino: "Philippine",
  Philippines: "Philippine",
  French: "Française",
  France: "Française",
  Greek: "Grecque",
  Greece: "Grecque",
  Indian: "Indienne",
  India: "Indienne",
  Irish: "Irlandaise",
  Ireland: "Irlandaise",
  Italian: "Italienne",
  Italy: "Italienne",
  Jamaican: "Jamaïcaine",
  Jamaica: "Jamaïcaine",
  Japanese: "Japonaise",
  Japan: "Japonaise",
  Kenyan: "Kényane",
  Kenya: "Kényane",
  Malaysian: "Malaisienne",
  Malaysia: "Malaisienne",
  Mexican: "Mexicaine",
  Mexico: "Mexicaine",
  Moroccan: "Marocaine",
  Morocco: "Marocaine",
  Polish: "Polonaise",
  Poland: "Polonaise",
  Portuguese: "Portugaise",
  Portugal: "Portugaise",
  Russian: "Russe",
  Russia: "Russe",
  Spanish: "Espagnole",
  Spain: "Espagnole",
  Thai: "Thaïlandaise",
  Thailand: "Thaïlandaise",
  Tunisian: "Tunisienne",
  Tunisia: "Tunisienne",
  Turkish: "Turque",
  Turkey: "Turque",
  Ukrainian: "Ukrainienne",
  Ukraine: "Ukrainienne",
  Uruguayan: "Uruguayenne",
  Uruguay: "Uruguayenne",
  Vietnamese: "Vietnamienne",
  Vietnam: "Vietnamienne",
  Unknown: "Non précisée",
};

const DEFAULT_AREA = "France";

/** list.php renvoie encore « French », filter.php attend « France ». */
const AREA_FILTER_ALIASES: Record<string, string> = {
  American: "United States",
  British: "United Kingdom",
  Canadian: "Canada",
  Chinese: "China",
  Croatian: "Croatia",
  Dutch: "Netherlands",
  Egyptian: "Egypt",
  Filipino: "Philippines",
  French: "France",
  Greek: "Greece",
  Indian: "India",
  Irish: "Ireland",
  Italian: "Italy",
  Jamaican: "Jamaica",
  Japanese: "Japan",
  Kenyan: "Kenya",
  Malaysian: "Malaysia",
  Mexican: "Mexico",
  Moroccan: "Morocco",
  Polish: "Poland",
  Portuguese: "Portugal",
  Russian: "Russia",
  Spanish: "Spain",
  Thai: "Thailand",
  Tunisian: "Tunisia",
  Turkish: "Turkey",
  Ukrainian: "Ukraine",
  Uruguayan: "Uruguay",
  Vietnamese: "Vietnam",
};

function resolveAreaFilter(area: string): string {
  return AREA_FILTER_ALIASES[area] ?? area;
}

export type MealSummary = {
  id: string;
  title: string;
  thumbUrl: string;
  category: string | null;
  categoryLabel: string | null;
  area: string | null;
  areaLabel: string | null;
};

export type MealDetail = MealSummary & {
  tags: string[];
  youtubeUrl: string | null;
  sourceUrl: string | null;
  ingredients: RecipeDraftIngredient[];
  steps: string[];
  notes: string | null;
};

type CacheEntry = { body: unknown; expiresAt: number };

const cache = new Map<string, CacheEntry>();

export function clearMealDbCache(): void {
  cache.clear();
}

function mealDbBaseUrl(): string {
  const key = process.env.THEMEALDB_API_KEY?.trim() || "1";
  const version = key === "1" ? "v1" : "v2";
  return `https://www.themealdb.com/api/json/${version}/${encodeURIComponent(key)}`;
}

function labelOf(map: Record<string, string>, value: string | null | undefined): string | null {
  if (!value) return null;
  return map[value] ?? value;
}

export function mealThumbUrl(
  thumb: string,
  size: "preview" | "small" | "medium" | "large" | "full" = "full",
): string {
  if (size === "full") return thumb;
  if (size === "preview") return `${thumb}/preview`;
  return `${thumb}/${size}`;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nonempty(value: unknown): string | null {
  const t = asString(value).trim();
  return t ? t : null;
}

/** « 3/4 cup », « 1 1/2 tsp », « 200g », « pinch ». */
export function parseMeasure(measure: string): { quantity: number | null; unit: string | null } {
  const t = measure.replace(/\u00bd/g, "1/2").replace(/\u00bc/g, "1/4").replace(/\u00be/g, "3/4").trim();
  if (!t) return { quantity: null, unit: null };

  const fraction = /^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)\s*(.*)$/.exec(t);
  if (fraction) {
    const whole = fraction[1] ? Number(fraction[1]) : 0;
    const den = Number(fraction[3]);
    const qty = den === 0 ? NaN : whole + Number(fraction[2]) / den;
    const unit = fraction[4]?.trim().slice(0, 20) || null;
    return { quantity: Number.isFinite(qty) && qty > 0 ? qty : null, unit };
  }

  const decimal = /^(\d+(?:[.,]\d+)?)\s*(.*)$/.exec(t);
  if (decimal) {
    return {
      quantity: parseQuantity(decimal[1] ?? ""),
      unit: decimal[2]?.trim().slice(0, 20) || null,
    };
  }

  return { quantity: null, unit: t.slice(0, 20) };
}

/** « Titre\nParagraphe » → « Titre : Paragraphe » (un seul step, pas deux). */
function joinTitledStep(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return lines[0] ?? "";
  const [title, ...rest] = lines;
  return `${title} : ${rest.join(" ")}`;
}

export function splitInstructions(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return [];

  const numbered = normalized.split(/\n+(?=\d+[.)]\s)/);
  if (numbered.length >= 2) {
    return numbered
      .map((s) => s.replace(/^\d+[.)]\s*/, "").trim())
      .filter(Boolean);
  }

  // Certaines fiches numérotent chaque étape sur sa propre ligne, suivie d'un titre
  // puis du paragraphe (ex. « 1\nPrepare the Batter\nMix flour... »).
  if (/^\d+\.?\s*\n/.test(normalized)) {
    const bareNumbered = normalized.split(/\n+(?=\d+\.?\s*\n)/);
    if (bareNumbered.length >= 2) {
      return bareNumbered
        .map((chunk) => joinTitledStep(chunk.replace(/^\d+\.?\s*\n/, "")))
        .filter(Boolean);
    }
  }

  return normalized
    .split(/\n+/)
    .map((s) => s.replace(/^\*\s*/, "").trim())
    .filter(Boolean);
}

/**
 * Certaines fiches (ex. Flija) listent la même ligne plusieurs fois pour des
 * variantes alternatives (« beurre fondu » répété pour 3 garnitures au choix) :
 * on ne garde qu'un exemplaire d'une ligne strictement identique.
 */
export function extractMealIngredients(meal: Record<string, unknown>): RecipeDraftIngredient[] {
  const ingredients: RecipeDraftIngredient[] = [];
  const seen = new Set<string>();

  for (let i = 1; i <= 20; i += 1) {
    const title = nonempty(meal[`strIngredient${i}`]);
    if (!title) continue;

    const measure = asString(meal[`strMeasure${i}`]);
    const { quantity, unit } = parseMeasure(measure);

    const key = `${title.toLowerCase().trim()}|${quantity ?? ""}|${(unit ?? "").toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    ingredients.push({
      title,
      quantity,
      unit,
      category: (detectCategory(title) ?? "AUTRE") as GroceryCategory,
    });
  }

  return ingredients;
}

function mealNotes(areaLabel: string | null, categoryLabel: string | null, sourceUrl: string | null): string | null {
  const parts = [areaLabel ? `Cuisine ${areaLabel.toLowerCase()}` : null, categoryLabel].filter(Boolean);
  const head = parts.join(" · ");
  if (head && sourceUrl) return `${head}\n${sourceUrl}`;
  return head || sourceUrl;
}

export function mealToSummary(meal: Record<string, unknown>): MealSummary | null {
  const id = nonempty(meal.idMeal);
  const title = nonempty(meal.strMeal);
  const thumbUrl = nonempty(meal.strMealThumb);
  if (!id || !title || !thumbUrl) return null;

  const category = nonempty(meal.strCategory);
  const area = nonempty(meal.strArea);

  return {
    id,
    title,
    thumbUrl,
    category,
    categoryLabel: labelOf(MEAL_CATEGORY_LABELS, category),
    area,
    areaLabel: labelOf(MEAL_AREA_LABELS, area),
  };
}

export function mealToDetail(meal: Record<string, unknown>): MealDetail | null {
  const summary = mealToSummary(meal);
  if (!summary) return null;

  const sourceUrl = nonempty(meal.strSource);
  const tags = (nonempty(meal.strTags) ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    ...summary,
    tags,
    youtubeUrl: nonempty(meal.strYoutube),
    sourceUrl,
    ingredients: extractMealIngredients(meal),
    steps: splitInstructions(asString(meal.strInstructions)),
    notes: mealNotes(summary.areaLabel, summary.categoryLabel, sourceUrl),
  };
}

export function mealDetailToDraft(detail: MealDetail): RecipeDraft {
  return {
    title: detail.title.slice(0, 200),
    timeLabel: null,
    servings: null,
    notes: detail.notes,
    ingredients: detail.ingredients.map((ingredient) => ({
      ...ingredient,
      title: ingredient.title.slice(0, 200),
    })),
    steps: detail.steps.map((step) => step.slice(0, 2000)).filter(Boolean).slice(0, 60),
  };
}

async function mealDbFetch(pathAndQuery: string, ttlMs = CACHE_TTL_MS): Promise<unknown> {
  const url = `${mealDbBaseUrl()}/${pathAndQuery.replace(/^\//, "")}`;
  const now = Date.now();
  const cached = cache.get(url);
  if (cached && now < cached.expiresAt) return cached.body;

  if (cache.size > 400) cache.clear();

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    console.error("[themealdb] HTTP", res.status, url);
    throw new Error("Catalogue TheMealDB temporairement indisponible.");
  }

  const body: unknown = await res.json();
  cache.set(url, { body, expiresAt: now + ttlMs });
  return body;
}

function mealsFromPayload(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  const meals = (payload as { meals?: unknown }).meals;
  if (!Array.isArray(meals)) return [];
  return meals.filter((m): m is Record<string, unknown> => !!m && typeof m === "object");
}

function mergeMeals(groups: MealSummary[][]): MealSummary[] {
  const seen = new Set<string>();
  const out: MealSummary[] = [];
  for (const meal of groups.flat()) {
    if (seen.has(meal.id)) continue;
    seen.add(meal.id);
    out.push(meal);
  }
  return out;
}

async function searchByName(query: string): Promise<MealSummary[]> {
  const payload = await mealDbFetch(`search.php?s=${encodeURIComponent(query)}`);
  return mealsFromPayload(payload)
    .map(mealToSummary)
    .filter((m): m is MealSummary => m !== null);
}

export async function searchMeals(query: string): Promise<MealSummary[]> {
  const q = query.trim();
  if (!q) return [];

  const variants = expandMealSearchQueries(q);
  const original = variants[0] ?? q;
  const translated = variants.slice(1);
  const category = frenchQueryCategory(q);
  const area = frenchQueryArea(q);

  const [originalHits, ...otherHits] = await Promise.all([
    searchByName(original),
    ...translated.map((variant) => searchByName(variant)),
    category ? filterMeals({ category }) : Promise.resolve([]),
    area ? filterMeals({ area }) : Promise.resolve([]),
  ]);

  const originalKept =
    translated.length === 0
      ? originalHits
      : originalHits.filter((meal) => titleMatchesWholeQuery(meal.title, original));

  let items = mergeMeals([originalKept, ...otherHits]);
  if (items.length === 0) {
    const ingredient = frenchQueryIngredient(q);
    if (ingredient) items = await filterMeals({ ingredient });
  }
  return applyFrenchToSummaries(items);
}

export async function lookupMeal(mealId: string): Promise<MealDetail | null> {
  const payload = await mealDbFetch(`lookup.php?i=${encodeURIComponent(mealId)}`);
  const meal = mealsFromPayload(payload)[0];
  const detail = meal ? mealToDetail(meal) : null;
  return detail ? applyFrenchToDetail(detail) : null;
}

export async function randomMeal(): Promise<MealDetail | null> {
  const payload = await mealDbFetch(`random.php?_=${Date.now()}`, 0);
  const meal = mealsFromPayload(payload)[0];
  const detail = meal ? mealToDetail(meal) : null;
  return detail ? applyFrenchToDetail(detail) : null;
}

export async function filterMeals(params: {
  category?: string;
  area?: string;
  ingredient?: string;
}): Promise<MealSummary[]> {
  const ingredient = params.ingredient?.trim();
  const category = params.category?.trim();
  const areaRaw = params.area?.trim();
  const area = areaRaw ? resolveAreaFilter(areaRaw) : undefined;

  let path: string | null = null;
  if (ingredient) path = `filter.php?i=${encodeURIComponent(ingredient)}`;
  else if (category) path = `filter.php?c=${encodeURIComponent(category)}`;
  else if (area) path = `filter.php?a=${encodeURIComponent(area)}`;
  if (!path) return [];

  const payload = await mealDbFetch(path);
  return mealsFromPayload(payload)
    .map(mealToSummary)
    .filter((m): m is MealSummary => m !== null)
    .map((meal) => ({
      ...meal,
      category: meal.category ?? category ?? null,
      categoryLabel: meal.categoryLabel ?? labelOf(MEAL_CATEGORY_LABELS, category),
      area: meal.area ?? area ?? null,
      areaLabel: meal.areaLabel ?? labelOf(MEAL_AREA_LABELS, area),
    }));
}

/** Recherche par nom, sinon filtre, sinon le catalogue français par défaut. */
export async function browseMeals(params: {
  query?: string;
  category?: string;
  area?: string;
  ingredient?: string;
}): Promise<MealSummary[]> {
  const query = params.query?.trim();
  if (query) return searchMeals(query);

  const filtered = await filterMeals({
    ingredient: params.ingredient,
    category: params.category,
    area: params.area,
  });
  if (filtered.length > 0 || params.ingredient || params.category || params.area) {
    return applyFrenchToSummaries(filtered);
  }

  return applyFrenchToSummaries(await filterMeals({ area: DEFAULT_AREA }));
}

export type MealFilterOption = { value: string; label: string };

/** TheMealDB renvoie parfois deux fois la même area (ex. « Channel Islander »). */
function dedupeByValue(options: MealFilterOption[]): MealFilterOption[] {
  const seen = new Set<string>();
  const out: MealFilterOption[] = [];
  for (const opt of options) {
    if (seen.has(opt.value)) continue;
    seen.add(opt.value);
    out.push(opt);
  }
  return out;
}

export async function listMealFilters(): Promise<{
  categories: MealFilterOption[];
  areas: MealFilterOption[];
}> {
  const [categoriesPayload, areasPayload] = await Promise.all([
    mealDbFetch("list.php?c=list", FILTERS_TTL_MS),
    mealDbFetch("list.php?a=list", FILTERS_TTL_MS),
  ]);

  const categories = dedupeByValue(
    mealsFromPayload(categoriesPayload)
      .map((m) => nonempty(m.strCategory))
      .filter((v): v is string => !!v)
      .map((value) => ({ value, label: MEAL_CATEGORY_LABELS[value] ?? value })),
  );

  const areas = dedupeByValue(
    mealsFromPayload(areasPayload)
      .map((m) => nonempty(m.strArea))
      .filter((v): v is string => !!v)
      .map((value) => ({ value, label: MEAL_AREA_LABELS[value] ?? value })),
  ).sort((a, b) => {
    if (a.value === "French") return -1;
    if (b.value === "French") return 1;
    const aKnown = a.value in MEAL_AREA_LABELS ? 0 : 1;
    const bKnown = b.value in MEAL_AREA_LABELS ? 0 : 1;
    if (aKnown !== bKnown) return aKnown - bKnown;
    return a.label.localeCompare(b.label, "fr");
  });

  return { categories, areas };
}
