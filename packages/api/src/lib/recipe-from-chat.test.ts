import { describe, expect, it } from "vitest";

import {
  parseIngredientLine,
  parseServings,
  recipeDraftFromChatMessage,
} from "./recipe-from-chat";

describe("parseIngredientLine", () => {
  it("sépare quantité, unité et titre", () => {
    expect(parseIngredientLine("200 g de farine")).toMatchObject({
      title: "farine",
      quantity: 200,
      unit: "g",
    });
  });

  it("gère une quantité décimale à la française", () => {
    const parsed = parseIngredientLine("1,5 kg de pommes de terre");
    expect(parsed.quantity).toBe(1.5);
    expect(parsed.unit).toBe("kg");
    expect(parsed.title).toBe("pommes de terre");
  });

  it("garde le nombre dans le titre quand il n'y a pas d'unité ni de reste", () => {
    // « 3 œufs » : sans « de », le mot restant est le titre et le nombre la quantité.
    const parsed = parseIngredientLine("3 œufs");
    expect(parsed.title).toBe("œufs");
    expect(parsed.quantity).toBe(3);
    expect(parsed.unit).toBeNull();
  });

  it("laisse intacte une ligne sans quantité", () => {
    const parsed = parseIngredientLine("sel et poivre");
    expect(parsed).toMatchObject({
      title: "sel et poivre",
      quantity: null,
      unit: null,
    });
  });

  it("détecte la catégorie via le dictionnaire courses", () => {
    expect(parseIngredientLine("500 g de tomates").category).toBe("LEGUME");
    expect(parseIngredientLine("20 cl de lait").category).toBe("LAITIER");
  });

  it("reconnaît les unités de cuisine", () => {
    expect(parseIngredientLine("2 cs de miel").unit).toBe("cs");
    expect(parseIngredientLine("1 gousse d'ail").unit).toBe("gousse");
  });
});

describe("parseServings", () => {
  it("extrait un nombre de parts", () => {
    expect(parseServings("Pour 4 personnes")).toBe(4);
    expect(parseServings("6 parts")).toBe(6);
  });

  it("retourne null hors intervalle ou sans mention", () => {
    expect(parseServings("30 min")).toBeNull();
    expect(parseServings(undefined)).toBeNull();
  });
});

describe("recipeDraftFromChatMessage", () => {
  const MESSAGE = [
    "Voici une idée avec vos articles :",
    "",
    "**1. Gratin de courgettes**",
    "⏱️ Temps : 40 min",
    "Un plat simple pour 4 personnes.",
    "📝 Ingrédients :",
    "- 600 g de courgettes",
    "- 20 cl de crème",
    "- sel",
    "👨‍🍳 Étapes :",
    "1. Émincer les courgettes",
    "2. Enfourner 30 minutes",
  ].join("\n");

  it("construit une recette complète depuis la réponse du Chef IA", () => {
    const draft = recipeDraftFromChatMessage(MESSAGE);

    expect(draft).not.toBeNull();
    expect(draft!.title).toBe("Gratin de courgettes");
    expect(draft!.timeLabel).toBe("Temps : 40 min");
    expect(draft!.servings).toBe(4);
    expect(draft!.steps).toEqual(["Émincer les courgettes", "Enfourner 30 minutes"]);
    expect(draft!.ingredients.map((i) => i.title)).toEqual([
      "courgettes",
      "crème",
      "sel",
    ]);
    expect(draft!.ingredients[0]).toMatchObject({ quantity: 600, unit: "g" });
  });

  it("sélectionne la recette demandée quand le message en contient plusieurs", () => {
    const twoRecipes = [
      "**1. Soupe**",
      "📝 Ingrédients :",
      "- 1 l de bouillon",
      "**2. Salade**",
      "📝 Ingrédients :",
      "- 1 laitue",
    ].join("\n");

    expect(recipeDraftFromChatMessage(twoRecipes, 0)!.title).toBe("Soupe");
    expect(recipeDraftFromChatMessage(twoRecipes, 1)!.title).toBe("Salade");
  });

  it("retourne null si le message ne contient aucune recette", () => {
    expect(recipeDraftFromChatMessage("Bonjour, que voulez-vous cuisiner ?")).toBeNull();
    expect(recipeDraftFromChatMessage(MESSAGE, 5)).toBeNull();
  });
});
