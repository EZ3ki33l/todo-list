import { describe, expect, it } from "vitest";

import {
  detectCategory,
  getTitleSuggestions,
  matchesSuggestionQuery,
  mergeItemMemory,
  normalizeItemTitle,
} from "../grocery-detect";

describe("normalizeItemTitle", () => {
  it("met en minuscules", () => {
    expect(normalizeItemTitle("TOMATE")).toBe("tomate");
  });

  it("supprime les accents", () => {
    expect(normalizeItemTitle("légumes")).toBe("legumes");
    expect(normalizeItemTitle("Épinards")).toBe("epinards");
  });

  it("remplace les apostrophes par des espaces", () => {
    expect(normalizeItemTitle("c'est")).toBe("c est");
    expect(normalizeItemTitle("l'eau")).toBe("l eau");
  });

  it("supprime les espaces en début et fin", () => {
    expect(normalizeItemTitle("  tomate  ")).toBe("tomate");
  });
});

describe("detectCategory", () => {
  it("détecte les légumes", () => {
    expect(detectCategory("tomates")).toBe("LEGUME");
    expect(detectCategory("Carottes")).toBe("LEGUME");
    expect(detectCategory("pomme de terre")).toBe("LEGUME");
  });

  it("détecte les fruits", () => {
    expect(detectCategory("pomme")).toBe("FRUIT");
    expect(detectCategory("Bananes")).toBe("FRUIT");
  });

  it("détecte la viande", () => {
    expect(detectCategory("poulet")).toBe("VIANDE");
    expect(detectCategory("steak")).toBe("VIANDE");
  });

  it("détecte les produits laitiers", () => {
    expect(detectCategory("lait")).toBe("LAITIER");
    expect(detectCategory("fromage")).toBe("LAITIER");
    expect(detectCategory("oeufs")).toBe("LAITIER");
  });

  it("détecte la boulangerie", () => {
    expect(detectCategory("pain")).toBe("BOULANGERIE");
    expect(detectCategory("baguettes")).toBe("BOULANGERIE");
  });

  it("détecte les boissons", () => {
    expect(detectCategory("eau")).toBe("BOISSON");
    expect(detectCategory("jus")).toBe("BOISSON");
  });

  it("ne confond pas lait et laitue", () => {
    expect(detectCategory("laitue")).toBe("LEGUME");
    expect(detectCategory("lait")).toBe("LAITIER");
  });

  it("retourne null pour un texte vide", () => {
    expect(detectCategory("")).toBeNull();
    expect(detectCategory("   ")).toBeNull();
  });

  it("retourne null si aucune catégorie connue", () => {
    expect(detectCategory("zzzzunknownxxx")).toBeNull();
  });

  it("utilise la mémoire si le dictionnaire ne connaît pas le titre", () => {
    expect(
      detectCategory("mon fromage artisanal", [
        { titleNorm: "mon fromage artisanal", category: "LAITIER" },
      ]),
    ).toBe("LAITIER");
  });

  it("ignore la mémoire si le dictionnaire matche d'abord", () => {
    // "tomate" → LEGUME via dictionnaire, la mémoire dit AUTRE mais ne doit pas s'appliquer
    expect(
      detectCategory("tomate", [{ titleNorm: "tomate", category: "AUTRE" }]),
    ).toBe("LEGUME");
  });
});

describe("mergeItemMemory", () => {
  it("fusionne sans doublons (userMemory prioritaire)", () => {
    const user = [{ titleNorm: "tomate", category: "LEGUME" as const }];
    const list = [
      { titleNorm: "tomate", category: "AUTRE" as const },
      { titleNorm: "pain", category: "BOULANGERIE" as const },
    ];
    const result = mergeItemMemory(user, list);
    expect(result).toHaveLength(2);
    expect(result.find((m) => m.titleNorm === "tomate")?.category).toBe("LEGUME");
    expect(result.find((m) => m.titleNorm === "pain")?.category).toBe("BOULANGERIE");
  });

  it("fonctionne avec des listes vides", () => {
    expect(mergeItemMemory([], [])).toEqual([]);
    expect(mergeItemMemory([{ titleNorm: "riz", category: "EPICERIE" }])).toEqual([
      { titleNorm: "riz", category: "EPICERIE" },
    ]);
  });
});

describe("matchesSuggestionQuery", () => {
  it("retourne false si query ou target est vide", () => {
    expect(matchesSuggestionQuery("", "tomate")).toBe(false);
    expect(matchesSuggestionQuery("tom", "")).toBe(false);
  });

  it("accepte un match par préfixe exact", () => {
    expect(matchesSuggestionQuery("tom", "tomate")).toBe(true);
  });

  it("accepte query qui démarre par target", () => {
    expect(matchesSuggestionQuery("tomate", "tom")).toBe(true);
  });

  it("accepte sous-chaîne pour query >= 3 chars", () => {
    expect(matchesSuggestionQuery("mat", "tomate")).toBe(true);
  });

  it("tolère une faute de frappe (Levenshtein)", () => {
    expect(matchesSuggestionQuery("tomat", "tomate")).toBe(true);
    expect(matchesSuggestionQuery("caroote", "carotte")).toBe(true);
  });

  it("rejette des mots totalement différents", () => {
    expect(matchesSuggestionQuery("abc", "xyz")).toBe(false);
  });
});

describe("getTitleSuggestions", () => {
  it("retourne vide si query est vide", () => {
    expect(getTitleSuggestions("")).toEqual([]);
  });

  it("propose des entrées du dictionnaire par préfixe", () => {
    const s = getTitleSuggestions("tom");
    expect(s.length).toBeGreaterThan(0);
    expect(s.some((x) => x.title.toLowerCase().includes("tomate"))).toBe(true);
    expect(s.every((x) => x.source === "dictionary")).toBe(true);
  });

  it("priorise l'historique utilisateur sur le dictionnaire", () => {
    const s = getTitleSuggestions("car", [
      { title: "Carottes bio", titleNorm: "carottes bio", category: "LEGUME", source: "history" },
    ]);
    expect(s[0]?.source).toBe("history");
    expect(s[0]?.title).toBe("Carottes bio");
  });

  it("inclut les entrées de liste partagée", () => {
    const s = getTitleSuggestions("riz", [
      { title: "Riz basmati", titleNorm: "riz basmati", category: "EPICERIE", source: "list" },
    ]);
    expect(s[0]?.source).toBe("list");
    expect(s[0]?.title).toBe("Riz basmati");
  });

  it("respecte la limite de résultats", () => {
    const s = getTitleSuggestions("a", [], 3);
    expect(s.length).toBeLessThanOrEqual(3);
  });

  it("ne propose pas de doublons", () => {
    const s = getTitleSuggestions("tomate");
    const titles = s.map((x) => x.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
  });
});
