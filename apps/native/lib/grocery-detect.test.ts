import { describe, expect, it } from "vitest";

import {
  detectCategory,
  getTitleSuggestions,
  matchesSuggestionQuery,
} from "./grocery-detect";

describe("detectCategory", () => {
  it("détecte via le dictionnaire fixe", () => {
    expect(detectCategory("tomates")).toBe("LEGUME");
    expect(detectCategory("lait")).toBe("LAITIER");
  });

  it("utilise la mémoire utilisateur si le dictionnaire ne connaît pas le mot", () => {
    expect(
      detectCategory("mon fromage local", [
        { titleNorm: "mon fromage local", category: "LAITIER" },
      ]),
    ).toBe("LAITIER");
  });

  it("ne confond pas lait et laitue", () => {
    expect(detectCategory("laitue")).toBe("LEGUME");
    expect(detectCategory("lait")).toBe("LAITIER");
  });
});

describe("matchesSuggestionQuery", () => {
  it("accepte préfixe et sous-chaîne", () => {
    expect(matchesSuggestionQuery("tom", "tomate")).toBe(true);
    expect(matchesSuggestionQuery("mate", "tomate")).toBe(true);
  });

  it("tolère une faute proche", () => {
    expect(matchesSuggestionQuery("tomat", "tomate")).toBe(true);
  });
});

describe("getTitleSuggestions", () => {
  it("propose des mots du dictionnaire par préfixe", () => {
    const s = getTitleSuggestions("tom");
    expect(s.some((x) => x.title.toLowerCase().includes("tomate"))).toBe(true);
    expect(s.some((x) => x.source === "dictionary")).toBe(true);
  });

  it("priorise l'historique utilisateur", () => {
    const s = getTitleSuggestions("test", [
      { title: "Test2", titleNorm: "test2", category: "AUTRE", source: "history" },
    ]);
    expect(s[0]).toEqual({
      title: "Test2",
      category: "AUTRE",
      source: "history",
    });
  });

  it("inclut le vocabulaire de liste partagée", () => {
    const s = getTitleSuggestions("riz", [
      { title: "Riz basmati", titleNorm: "riz basmati", category: "EPICERIE", source: "list" },
    ]);
    expect(s[0]?.source).toBe("list");
  });
});
