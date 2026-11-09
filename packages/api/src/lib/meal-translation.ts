import { prisma } from "@repo/db";
import { detectCategory, type GroceryCategory } from "@repo/domain/grocery-detect";

import { translateToFrench } from "./deepl-client";
import type { MealDetail, MealSummary } from "./themealdb";
import { translateMeasureUnit } from "./themealdb-fr";

type CachedTranslation = {
  title: string;
  ingredients: string[] | null;
  steps: string[] | null;
};

function asStringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((v) => typeof v === "string")
    ? (value as string[])
    : null;
}

async function getCached(mealIds: string[]): Promise<Map<string, CachedTranslation>> {
  if (mealIds.length === 0) return new Map();

  const rows = await prisma.mealTranslation.findMany({ where: { mealId: { in: mealIds } } });
  const map = new Map<string, CachedTranslation>();
  for (const row of rows) {
    map.set(row.mealId, {
      title: row.title,
      ingredients: asStringArray(row.ingredients),
      steps: asStringArray(row.steps),
    });
  }
  return map;
}

/** Traduit les titres affichés dans le catalogue (recherche / navigation) ; met en cache le résultat. */
export async function applyFrenchToSummaries(summaries: MealSummary[]): Promise<MealSummary[]> {
  if (summaries.length === 0) return summaries;

  const cache = await getCached(summaries.map((meal) => meal.id));
  const missing = summaries.filter((meal) => !cache.has(meal.id));

  if (missing.length > 0) {
    const translated = await translateToFrench(missing.map((meal) => meal.title));
    await Promise.all(
      missing.map((meal, i) =>
        prisma.mealTranslation
          .upsert({
            where: { mealId: meal.id },
            create: { mealId: meal.id, title: translated[i] ?? meal.title },
            update: {},
          })
          .catch((err) => console.error("[meal-translation] mise en cache échouée", err)),
      ),
    );
    missing.forEach((meal, i) =>
      cache.set(meal.id, { title: translated[i] ?? meal.title, ingredients: null, steps: null }),
    );
  }

  return summaries.map((meal) => ({ ...meal, title: cache.get(meal.id)?.title ?? meal.title }));
}

/** Traduit titre, ingrédients et étapes d'une fiche complète (détail, import, chat) ; met en cache le résultat. */
export async function applyFrenchToDetail(detail: MealDetail): Promise<MealDetail> {
  const cached = (await getCached([detail.id])).get(detail.id);
  if (
    cached?.ingredients &&
    cached.steps &&
    cached.ingredients.length === detail.ingredients.length &&
    cached.steps.length === detail.steps.length
  ) {
    return withTranslation(detail, cached.title, cached.ingredients, cached.steps);
  }

  const texts = [detail.title, ...detail.ingredients.map((ingredient) => ingredient.title), ...detail.steps];
  const translated = await translateToFrench(texts);
  const title = translated[0] ?? detail.title;
  const ingredientTitles = translated.slice(1, 1 + detail.ingredients.length);
  const steps = translated.slice(1 + detail.ingredients.length);

  await prisma.mealTranslation
    .upsert({
      where: { mealId: detail.id },
      create: { mealId: detail.id, title, ingredients: ingredientTitles, steps },
      update: { title, ingredients: ingredientTitles, steps },
    })
    .catch((err) => console.error("[meal-translation] mise en cache échouée", err));

  return withTranslation(detail, title, ingredientTitles, steps);
}

function withTranslation(
  detail: MealDetail,
  title: string,
  ingredientTitles: string[],
  steps: string[],
): MealDetail {
  return {
    ...detail,
    title,
    ingredients: detail.ingredients.map((ingredient, i) => {
      const translatedTitle = ingredientTitles[i] ?? ingredient.title;
      return {
        ...ingredient,
        title: translatedTitle,
        unit: translateMeasureUnit(ingredient.unit, ingredient.quantity),
        category: (detectCategory(translatedTitle) ?? ingredient.category) as GroceryCategory,
      };
    }),
    steps: steps.length === detail.steps.length ? steps : detail.steps,
  };
}
