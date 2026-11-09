import { afterEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const upsert = vi.fn().mockResolvedValue(undefined);
const translateToFrench = vi.fn();

vi.mock("@repo/db", () => ({
  prisma: { mealTranslation: { findMany: (...args: unknown[]) => findMany(...args), upsert: (...args: unknown[]) => upsert(...args) } },
}));

vi.mock("./deepl-client", () => ({
  translateToFrench: (...args: unknown[]) => translateToFrench(...args),
}));

const { applyFrenchToDetail, applyFrenchToSummaries } = await import("./meal-translation");
import type { MealDetail, MealSummary } from "./themealdb";

function summary(id: string, title: string): MealSummary {
  return { id, title, thumbUrl: "https://x.test/a.jpg", category: null, categoryLabel: null, area: null, areaLabel: null };
}

function detail(overrides: Partial<MealDetail> = {}): MealDetail {
  return {
    id: "52772",
    title: "Chicken Curry",
    thumbUrl: "https://x.test/a.jpg",
    category: "Chicken",
    categoryLabel: "Poulet",
    area: "Indian",
    areaLabel: "Indienne",
    tags: [],
    youtubeUrl: null,
    sourceUrl: null,
    ingredients: [
      { title: "Chicken", quantity: 2, unit: null, category: "AUTRE" },
      { title: "Onion", quantity: 1, unit: null, category: "AUTRE" },
    ],
    steps: ["Cook the chicken.", "Add the onion."],
    notes: null,
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("applyFrenchToSummaries", () => {
  it("réutilise le cache sans appeler DeepL", async () => {
    findMany.mockResolvedValue([{ mealId: "1", title: "Poulet au curry", ingredients: null, steps: null }]);

    const result = await applyFrenchToSummaries([summary("1", "Chicken Curry")]);

    expect(result[0]?.title).toBe("Poulet au curry");
    expect(translateToFrench).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("traduit et met en cache les titres absents", async () => {
    findMany.mockResolvedValue([]);
    translateToFrench.mockResolvedValue(["Poulet au curry", "Soupe à l'oignon"]);

    const result = await applyFrenchToSummaries([summary("1", "Chicken Curry"), summary("2", "Onion Soup")]);

    expect(translateToFrench).toHaveBeenCalledWith(["Chicken Curry", "Onion Soup"]);
    expect(result.map((m) => m.title)).toEqual(["Poulet au curry", "Soupe à l'oignon"]);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledWith({
      where: { mealId: "1" },
      create: { mealId: "1", title: "Poulet au curry" },
      update: {},
    });
  });

  it("ne traduit que les titres manquants quand le cache est partiel", async () => {
    findMany.mockResolvedValue([{ mealId: "1", title: "Poulet au curry", ingredients: null, steps: null }]);
    translateToFrench.mockResolvedValue(["Soupe à l'oignon"]);

    const result = await applyFrenchToSummaries([summary("1", "Chicken Curry"), summary("2", "Onion Soup")]);

    expect(translateToFrench).toHaveBeenCalledWith(["Onion Soup"]);
    expect(result.map((m) => m.title)).toEqual(["Poulet au curry", "Soupe à l'oignon"]);
  });

  it("renvoie un tableau vide sans appel réseau", async () => {
    const result = await applyFrenchToSummaries([]);
    expect(result).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe("applyFrenchToDetail", () => {
  it("réutilise une traduction complète en cache", async () => {
    findMany.mockResolvedValue([
      { mealId: "52772", title: "Curry de poulet", ingredients: ["Poulet", "Oignon"], steps: ["Cuire le poulet.", "Ajouter l'oignon."] },
    ]);

    const result = await applyFrenchToDetail(detail());

    expect(translateToFrench).not.toHaveBeenCalled();
    expect(result.title).toBe("Curry de poulet");
    expect(result.ingredients.map((i) => i.title)).toEqual(["Poulet", "Oignon"]);
    expect(result.steps).toEqual(["Cuire le poulet.", "Ajouter l'oignon."]);
  });

  it("recalcule la catégorie de courses à partir du titre traduit", async () => {
    findMany.mockResolvedValue([]);
    translateToFrench.mockResolvedValue(["Curry de poulet", "Poulet", "Oignon", "Cuire le poulet.", "Ajouter l'oignon."]);

    const result = await applyFrenchToDetail(detail());

    expect(translateToFrench).toHaveBeenCalledWith([
      "Chicken Curry",
      "Chicken",
      "Onion",
      "Cook the chicken.",
      "Add the onion.",
    ]);
    expect(result.ingredients[0]).toMatchObject({ title: "Poulet", category: "VIANDE" });
    expect(result.ingredients[1]).toMatchObject({ title: "Oignon", category: "LEGUME" });
    expect(upsert).toHaveBeenCalledWith({
      where: { mealId: "52772" },
      create: {
        mealId: "52772",
        title: "Curry de poulet",
        ingredients: ["Poulet", "Oignon"],
        steps: ["Cuire le poulet.", "Ajouter l'oignon."],
      },
      update: {
        title: "Curry de poulet",
        ingredients: ["Poulet", "Oignon"],
        steps: ["Cuire le poulet.", "Ajouter l'oignon."],
      },
    });
  });

  it("traduit aussi l'unité de mesure", async () => {
    findMany.mockResolvedValue([]);
    translateToFrench.mockResolvedValue(["Curry de poulet", "Poulet", "Oignon", "Cuire le poulet.", "Ajouter l'oignon."]);

    const result = await applyFrenchToDetail(
      detail({
        ingredients: [
          { title: "Chicken", quantity: 5, unit: "tablespoons", category: "AUTRE" },
          { title: "Onion", quantity: 1, unit: "clove", category: "AUTRE" },
        ],
      }),
    );

    expect(result.ingredients[0]?.unit).toBe("cuillères à soupe");
    expect(result.ingredients[1]?.unit).toBe("gousse");
  });

  it("retraduit si le cache ne couvre que le titre (ex. venant du catalogue)", async () => {
    findMany.mockResolvedValue([{ mealId: "52772", title: "Curry de poulet", ingredients: null, steps: null }]);
    translateToFrench.mockResolvedValue(["Curry de poulet", "Poulet", "Oignon", "Cuire le poulet.", "Ajouter l'oignon."]);

    const result = await applyFrenchToDetail(detail());

    expect(translateToFrench).toHaveBeenCalledTimes(1);
    expect(result.ingredients.map((i) => i.title)).toEqual(["Poulet", "Oignon"]);
  });
});
