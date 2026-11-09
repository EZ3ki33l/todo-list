import { describe, expect, it, vi } from "vitest";

import { parseChefMessage } from "@repo/domain/chef-message";

vi.mock("./meal-translation", () => ({
  applyFrenchToSummaries: async (items: unknown) => items,
  applyFrenchToDetail: async (item: unknown) => item,
}));

import {
  formatCatalogChatReply,
  isGenericChefPrompt,
  itemsToAddFromMeals,
  pickIngredientSearchTerms,
  skipCatalogForMessage,
} from "./recipe-chat-catalog";
import type { MealDetail } from "./themealdb";

const TERIYAKI: MealDetail = {
  id: "52772",
  title: "Teriyaki Chicken Casserole",
  thumbUrl: "https://www.themealdb.com/images/media/meals/x.jpg",
  category: "Chicken",
  categoryLabel: "Poulet",
  area: "Japanese",
  areaLabel: "Japonaise",
  tags: ["Meat"],
  youtubeUrl: null,
  sourceUrl: "https://example.com/teriyaki",
  notes: null,
  ingredients: [
    { title: "soy sauce", quantity: 0.75, unit: "cup", category: "EPICERIE" },
    { title: "chicken breasts", quantity: 2, unit: null, category: "VIANDE" },
    { title: "salt", quantity: null, unit: "pinch", category: "EPICERIE" },
  ],
  steps: ["Preheat oven.", "Bake the chicken."],
};

describe("isGenericChefPrompt / skipCatalogForMessage", () => {
  it("reconnaît les puces d'accueil", () => {
    expect(isGenericChefPrompt("Surprenez-moi !")).toBe(true);
    expect(isGenericChefPrompt("Un plat rapide")).toBe(true);
    expect(isGenericChefPrompt("lasagnes")).toBe(false);
  });

  it("laisse TheMealDB de côté si l'utilisateur veut autre chose", () => {
    expect(skipCatalogForMessage("autre chose")).toBe(true);
    expect(skipCatalogForMessage("lasagnes")).toBe(false);
  });
});

describe("pickIngredientSearchTerms", () => {
  it("traduit les articles et ignore l'épicerie de base", () => {
    expect(pickIngredientSearchTerms(["Poulet 1 kg", "sel", "Tomates"])).toEqual([
      "chicken",
      "tomato",
    ]);
  });
});

describe("formatCatalogChatReply", () => {
  it("produit un message parsable par le Chef IA", () => {
    const reply = formatCatalogChatReply([TERIYAKI]);
    const parsed = parseChefMessage(reply);
    expect(parsed.recipes).toHaveLength(1);
    expect(parsed.recipes[0]?.title).toBe("Teriyaki Chicken Casserole");
    expect(parsed.recipes[0]?.sections.some((s) => s.kind === "ingredients")).toBe(true);
    expect(parsed.recipes[0]?.sections.some((s) => s.kind === "steps")).toBe(true);
  });
});

describe("itemsToAddFromMeals", () => {
  it("propose les ingrédients absents de la liste", () => {
    const items = itemsToAddFromMeals([TERIYAKI], ["Poulet 1 kg"]);
    expect(items.map((i) => i.title)).toEqual(["soy sauce"]);
  });
});
