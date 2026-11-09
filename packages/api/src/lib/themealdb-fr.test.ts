import { describe, expect, it } from "vitest";

import {
  englishTermsForIngredient,
  expandMealSearchQueries,
  frenchQueryArea,
  frenchQueryCategory,
  frenchQueryIngredient,
  titleMatchesWholeQuery,
  translateMeasureUnit,
} from "./themealdb-fr";

describe("expandMealSearchQueries", () => {
  it("ajoute l'équivalent anglais d'un mot français", () => {
    expect(expandMealSearchQueries("poulet")).toEqual(["poulet", "chicken"]);
    expect(expandMealSearchQueries("pâtes")).toEqual(["pâtes", "pasta"]);
    expect(expandMealSearchQueries("bœuf")).toEqual(["bœuf", "beef"]);
  });

  it("traduit une locution et retire les mots-outils", () => {
    expect(expandMealSearchQueries("poulet au curry")).toEqual([
      "poulet au curry",
      "chicken au curry",
      "chicken curry",
    ]);
  });

  it("laisse une requête déjà anglaise inchangée", () => {
    expect(expandMealSearchQueries("chicken")).toEqual(["chicken"]);
  });
});

describe("frenchQueryCategory / Area / Ingredient", () => {
  it("reconnaît une catégorie", () => {
    expect(frenchQueryCategory("pâtes")).toBe("Pasta");
    expect(frenchQueryCategory("végétarien")).toBe("Vegetarian");
    expect(frenchQueryCategory("poulet au curry")).toBeNull();
  });

  it("reconnaît une cuisine", () => {
    expect(frenchQueryArea("italien")).toBe("Italian");
    expect(frenchQueryArea("japonaise")).toBe("Japanese");
    expect(frenchQueryArea("poulet")).toBeNull();
  });

  it("reconnaît un ingrédient isolé", () => {
    expect(frenchQueryIngredient("tomate")).toBe("tomato");
    expect(frenchQueryIngredient("poulet au curry")).toBeNull();
  });
});

describe("englishTermsForIngredient", () => {
  it("traduit un article de courses", () => {
    expect(englishTermsForIngredient("Poulet")).toEqual(["chicken"]);
    expect(englishTermsForIngredient("courgettes")).toEqual(["zucchini"]);
  });
});

describe("translateMeasureUnit", () => {
  it("traduit au singulier ou au pluriel selon la quantité", () => {
    expect(translateMeasureUnit("tablespoons", 5)).toBe("cuillères à soupe");
    expect(translateMeasureUnit("tablespoon", 1)).toBe("cuillère à soupe");
    expect(translateMeasureUnit("tsp", 1)).toBe("cuillère à café");
    expect(translateMeasureUnit("cloves", 3)).toBe("gousses");
    expect(translateMeasureUnit("tbs", 3)).toBe("cuillères à soupe");
  });

  it("laisse une unité déjà neutre inchangée (g, kg, ml, L)", () => {
    expect(translateMeasureUnit("g", 200)).toBe("g");
    expect(translateMeasureUnit("ml", 200)).toBe("ml");
  });

  it("gère l'absence d'unité ou de quantité", () => {
    expect(translateMeasureUnit(null, 2)).toBeNull();
    expect(translateMeasureUnit("cup", null)).toBe("tasse");
  });
});

describe("titleMatchesWholeQuery", () => {
  it("garde un titre qui contient le mot", () => {
    expect(titleMatchesWholeQuery("Poulet Roti a l'Algerienne", "poulet")).toBe(true);
  });

  it("ignore un faux positif de sous-chaîne", () => {
    expect(titleMatchesWholeQuery("Chorizo & tomato salad", "riz")).toBe(false);
  });
});
