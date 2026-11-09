import { describe, expect, it } from "vitest";

import { recipeSourceBadge } from "../recipe-source";

describe("recipeSourceBadge", () => {
  it("décrit les sources importées", () => {
    expect(recipeSourceBadge("CHEF_IA")).toEqual({ emoji: "👨‍🍳", label: "Chef IA" });
    expect(recipeSourceBadge("MEALDB")).toEqual({ emoji: "🌍", label: "TheMealDB" });
  });

  it("n'affiche aucun badge pour une saisie manuelle", () => {
    expect(recipeSourceBadge("MANUAL")).toBeNull();
  });

  it("tolère une valeur inconnue", () => {
    expect(recipeSourceBadge("FUTURE_SOURCE")).toBeNull();
  });
});
