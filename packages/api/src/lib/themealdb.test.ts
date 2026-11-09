import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./meal-translation", () => ({
  applyFrenchToSummaries: async (items: unknown) => items,
  applyFrenchToDetail: async (item: unknown) => item,
}));

import {
  browseMeals,
  clearMealDbCache,
  extractMealIngredients,
  listMealFilters,
  mealDetailToDraft,
  mealThumbUrl,
  mealToDetail,
  mealToSummary,
  parseMeasure,
  searchMeals,
  splitInstructions,
} from "./themealdb";

const TERIYAKI: Record<string, unknown> = {
  idMeal: "52772",
  strMeal: "Teriyaki Chicken Casserole",
  strCategory: "Chicken",
  strArea: "Japanese",
  strInstructions:
    "Preheat oven to 350° F.\r\nCombine soy sauce and water.\r\nPlace the chicken breasts in the pan.",
  strMealThumb: "https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg",
  strTags: "Meat,Casserole",
  strYoutube: "https://www.youtube.com/watch?v=4aZr5hZXP_s",
  strSource: "https://example.com/teriyaki",
  strIngredient1: "soy sauce",
  strIngredient2: "water",
  strIngredient3: "chicken breasts",
  strIngredient4: "",
  strIngredient5: null,
  strMeasure1: "3/4 cup",
  strMeasure2: "1/2 cup",
  strMeasure3: "2",
  strMeasure4: "",
  strMeasure5: null,
};

describe("parseMeasure", () => {
  it("parse une fraction simple", () => {
    expect(parseMeasure("3/4 cup")).toEqual({ quantity: 0.75, unit: "cup" });
    expect(parseMeasure("1/2 teaspoon")).toEqual({ quantity: 0.5, unit: "teaspoon" });
  });

  it("parse une fraction mixte", () => {
    expect(parseMeasure("1 1/2 tsp")).toEqual({ quantity: 1.5, unit: "tsp" });
  });

  it("parse un entier avec unité", () => {
    expect(parseMeasure("3 cups")).toEqual({ quantity: 3, unit: "cups" });
    expect(parseMeasure("200g")).toEqual({ quantity: 200, unit: "g" });
  });

  it("parse un nombre seul", () => {
    expect(parseMeasure("2")).toEqual({ quantity: 2, unit: null });
  });

  it("garde une unité sans quantité", () => {
    expect(parseMeasure("pinch")).toEqual({ quantity: null, unit: "pinch" });
  });

  it("gère les fractions unicode", () => {
    expect(parseMeasure("½ cup")).toEqual({ quantity: 0.5, unit: "cup" });
  });

  it("retourne vide pour une mesure absente", () => {
    expect(parseMeasure("")).toEqual({ quantity: null, unit: null });
    expect(parseMeasure("   ")).toEqual({ quantity: null, unit: null });
  });
});

describe("splitInstructions", () => {
  it("coupe les paragraphes", () => {
    expect(splitInstructions("A.\r\nB.\r\nC.")).toEqual(["A.", "B.", "C."]);
  });

  it("coupe les étapes numérotées", () => {
    expect(splitInstructions("1. Préchauffer\n2. Mélanger\n3. Enfourner")).toEqual([
      "Préchauffer",
      "Mélanger",
      "Enfourner",
    ]);
  });

  it("retourne vide si pas d'instructions", () => {
    expect(splitInstructions("")).toEqual([]);
  });

  it("regroupe numéro isolé + titre + paragraphe en une seule étape", () => {
    const raw =
      "\r\n1\r\nPrepare the Flour Batter\r\nMix the flour and water.\r\n2\r\nBaking\r\nCook until golden.";
    expect(splitInstructions(raw)).toEqual([
      "Prepare the Flour Batter : Mix the flour and water.",
      "Baking : Cook until golden.",
    ]);
  });
});

describe("extractMealIngredients", () => {
  it("ignore les emplacements vides et parse les mesures", () => {
    const ingredients = extractMealIngredients(TERIYAKI);
    expect(ingredients).toHaveLength(3);
    expect(ingredients[0]).toMatchObject({
      title: "soy sauce",
      quantity: 0.75,
      unit: "cup",
      category: "EPICERIE",
    });
    expect(ingredients[2]).toMatchObject({
      title: "chicken breasts",
      quantity: 2,
      unit: null,
      category: "VIANDE",
    });
  });

  it("déduplique une ligne strictement identique (variantes alternatives type Flija)", () => {
    const meal: Record<string, unknown> = {
      strIngredient1: "Melted Butter",
      strMeasure1: "220g",
      strIngredient2: "Greek Yogurt",
      strMeasure2: "5 tablespoons",
      strIngredient3: "Melted Butter",
      strMeasure3: "220g",
      strIngredient4: "Sour Cream",
      strMeasure4: "500ml",
    };
    const ingredients = extractMealIngredients(meal);
    expect(ingredients.map((i) => i.title)).toEqual(["Melted Butter", "Greek Yogurt", "Sour Cream"]);
  });

  it("garde deux lignes de même nom si la quantité diffère", () => {
    const meal: Record<string, unknown> = {
      strIngredient1: "Melted Butter",
      strMeasure1: "220g",
      strIngredient2: "Melted Butter",
      strMeasure2: "100g",
    };
    const ingredients = extractMealIngredients(meal);
    expect(ingredients).toHaveLength(2);
  });
});

describe("mealToSummary / mealToDetail", () => {
  it("mappe un plat complet", () => {
    const summary = mealToSummary(TERIYAKI);
    expect(summary).toMatchObject({
      id: "52772",
      title: "Teriyaki Chicken Casserole",
      category: "Chicken",
      categoryLabel: "Poulet",
      area: "Japanese",
      areaLabel: "Japonaise",
    });

    const detail = mealToDetail(TERIYAKI);
    expect(detail?.tags).toEqual(["Meat", "Casserole"]);
    expect(detail?.youtubeUrl).toContain("youtube");
    expect(detail?.steps).toHaveLength(3);
    expect(detail?.notes).toContain("japonaise");
    expect(detail?.notes).toContain("https://example.com/teriyaki");
  });

  it("rejette un plat sans titre", () => {
    expect(mealToSummary({ idMeal: "1", strMealThumb: "https://x.test/a.jpg" })).toBeNull();
  });
});

describe("mealDetailToDraft", () => {
  it("produit un brouillon prêt à enregistrer", () => {
    const detail = mealToDetail(TERIYAKI);
    expect(detail).not.toBeNull();
    const draft = mealDetailToDraft(detail!);
    expect(draft.title).toBe("Teriyaki Chicken Casserole");
    expect(draft.timeLabel).toBeNull();
    expect(draft.ingredients).toHaveLength(3);
    expect(draft.steps.length).toBeGreaterThan(0);
  });
});

describe("mealThumbUrl", () => {
  const src = "https://www.themealdb.com/images/media/meals/abc.jpg";

  it("ajoute le suffixe de taille", () => {
    expect(mealThumbUrl(src, "preview")).toBe(`${src}/preview`);
    expect(mealThumbUrl(src, "medium")).toBe(`${src}/medium`);
    expect(mealThumbUrl(src, "full")).toBe(src);
  });
});

describe("searchMeals / browseMeals", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearMealDbCache();
  });

  it("mappe une recherche par nom", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ meals: [TERIYAKI] }),
      })),
    );

    const items = await searchMeals("teriyaki");
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("52772");
    expect(items[0]?.categoryLabel).toBe("Poulet");
  });

  it("cherche aussi l'anglais pour une requête française", async () => {
    const fetchMock = vi.fn(async (_url: string) => ({
      ok: true,
      json: async () => ({ meals: null }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await searchMeals("poulet");
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes("search.php?s=poulet"))).toBe(true);
    expect(urls.some((url) => url.includes("search.php?s=chicken"))).toBe(true);
    expect(urls.some((url) => url.includes("filter.php?c=Chicken"))).toBe(true);
  });

  it("parcourt la cuisine française par défaut", async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => {
        if (String(url).includes("filter.php?a=France")) {
          return {
            meals: [
              {
                idMeal: "52903",
                strMeal: "French Onion Soup",
                strMealThumb: "https://www.themealdb.com/images/media/meals/x.jpg",
              },
            ],
          };
        }
        return { meals: null };
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const items = await browseMeals({});
    expect(items[0]?.title).toBe("French Onion Soup");
    expect(items[0]?.area).toBe("France");
    expect(items[0]?.areaLabel).toBe("Française");
  });

  it("convertit l'adjectif d'aire en nom de pays pour le filtre", async () => {
    const fetchMock = vi.fn(async (_url: string) => ({
      ok: true,
      json: async () => ({ meals: null }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await browseMeals({ area: "French" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("filter.php?a=France");
  });

  it("signale une indisponibilité HTTP", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({}),
      })),
    );

    await expect(searchMeals("pasta")).rejects.toThrow(/TheMealDB/);
  });
});

describe("listMealFilters", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearMealDbCache();
  });

  it("déduplique les areas (TheMealDB renvoie parfois des doublons)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () => {
          if (String(url).includes("list.php?a=list")) {
            return { meals: [{ strArea: "French" }, { strArea: "Dominican" }, { strArea: "Dominican" }] };
          }
          return { meals: [{ strCategory: "Chicken" }] };
        },
      })),
    );

    const { areas } = await listMealFilters();
    expect(areas.filter((a) => a.value === "Dominican")).toHaveLength(1);
  });
});
