import { describe, expect, it } from "vitest";

import {
  isListLine,
  listItemText,
  parseChefMessage,
  parseInlineSpans,
  parseTime,
  sectionKind,
  stripMd,
} from "../chef-message";

describe("stripMd", () => {
  it("retire gras et italique", () => {
    expect(stripMd("**Tarte** aux *pommes*")).toBe("Tarte aux pommes");
  });
});

describe("isListLine / listItemText", () => {
  it("reconnaît puces et numéros", () => {
    expect(isListLine("- 200 g de farine")).toBe(true);
    expect(isListLine("• sel")).toBe(true);
    expect(isListLine("1. Mélanger")).toBe(true);
    expect(isListLine("Mélanger")).toBe(false);
  });

  it("retire le marqueur de liste", () => {
    expect(listItemText("- **200 g** de farine")).toBe("200 g de farine");
    expect(listItemText("2. Cuire")).toBe("Cuire");
  });
});

describe("sectionKind", () => {
  it("détecte ingrédients et étapes", () => {
    expect(sectionKind("**Ingrédients**")).toBe("ingredients");
    expect(sectionKind("📝 Liste")).toBe("ingredients");
    expect(sectionKind("**Étapes**")).toBe("steps");
    expect(sectionKind("Preparation")).toBe("steps");
    expect(sectionKind("Bonjour")).toBeNull();
  });
});

describe("parseTime", () => {
  it("extrait une durée", () => {
    expect(parseTime("⏱️ 30 min")).toBe("30 min");
    expect(parseTime("⏱️ Temps : 40 min")).toBe("Temps : 40 min");
    expect(parseTime("45 min")).toBe("45 min");
    expect(parseTime("Bonjour")).toBeUndefined();
  });

  it("ne confond pas une étape mentionnant des minutes avec une durée", () => {
    expect(parseTime("2. Enfourner 30 minutes")).toBeUndefined();
    expect(parseTime("- Laisser reposer 10 min")).toBeUndefined();
    expect(parseTime("Enfourner 30 minutes")).toBeUndefined();
  });
});

describe("parseInlineSpans", () => {
  it("découpe gras, italique et texte brut", () => {
    expect(parseInlineSpans("a **b** c *d*")).toEqual([
      { text: "a ", emphasis: "none" },
      { text: "b", emphasis: "strong" },
      { text: " c ", emphasis: "none" },
      { text: "d", emphasis: "em" },
      { text: "", emphasis: "none" },
    ]);
  });
});

describe("parseChefMessage", () => {
  it("retourne des blocs vides pour un texte vide", () => {
    expect(parseChefMessage("")).toEqual({ intro: [], recipes: [], seasons: [] });
  });

  it("garde un texte libre en intro", () => {
    const parsed = parseChefMessage("Bonjour !\n\nQue voulez-vous cuisiner ?");
    expect(parsed.intro).toEqual(["Bonjour !", "Que voulez-vous cuisiner ?"]);
    expect(parsed.recipes).toHaveLength(0);
  });

  it("parse une recette au format produit par l'API", () => {
    const parsed = parseChefMessage(
      [
        "Voici une idée :",
        "",
        "**1. Tarte aux pommes**",
        "⏱️ Temps : 45 min",
        "Un grand classique.",
        "📝 Ingrédients :",
        "- 200 g de farine",
        "- 4 pommes",
        "👨‍🍳 Étapes :",
        "1. Préchauffer le four",
        "2. Étaler la pâte",
      ].join("\n"),
    );

    expect(parsed.intro).toEqual(["Voici une idée :"]);
    expect(parsed.recipes).toHaveLength(1);

    const recipe = parsed.recipes[0]!;
    expect(recipe.title).toBe("Tarte aux pommes");
    expect(recipe.time).toBe("Temps : 45 min");
    expect(recipe.intro).toBe("Un grand classique.");
    expect(recipe.sections).toEqual([
      { kind: "ingredients", label: "Ingrédients :", items: ["200 g de farine", "4 pommes"] },
      { kind: "steps", label: "Étapes :", items: ["Préchauffer le four", "Étaler la pâte"] },
    ]);
  });

  it("sépare deux recettes numérotées", () => {
    const parsed = parseChefMessage(
      [
        "**1. Soupe**",
        "📝 Ingrédients :",
        "- eau",
        "**2. Salade**",
        "📝 Ingrédients :",
        "- laitue",
      ].join("\n"),
    );
    expect(parsed.recipes.map((r) => r.title)).toEqual(["Soupe", "Salade"]);
    expect(parsed.recipes[1]!.sections[0]!.items).toEqual(["laitue"]);
  });

  it("rattache le texte qui suit une recette à sa dernière section", () => {
    const parsed = parseChefMessage(
      ["**Tarte**", "📝 Ingrédients :", "- farine", "", "Bon appétit !"].join("\n"),
    );
    expect(parsed.recipes).toHaveLength(1);
    expect(parsed.recipes[0]!.sections[0]!.items).toEqual(["farine", "Bon appétit !"]);
    expect(parsed.intro).toEqual([]);
  });

  it("parse les blocs de saison", () => {
    const parsed = parseChefMessage(
      ["**Printemps**", "Légumes : asperges", "**Été**", "Légumes : tomates"].join("\n"),
    );
    expect(parsed.seasons).toEqual([
      { name: "Printemps", lines: ["Légumes : asperges"] },
      { name: "Été", lines: ["Légumes : tomates"] },
    ]);
    expect(parsed.recipes).toHaveLength(0);
  });

  it("ignore les lignes vides dans une recette", () => {
    const parsed = parseChefMessage(
      ["**Soupe**", "", "⏱️ Temps : 10 min", "", "📝 Ingrédients :", "- eau"].join("\n"),
    );
    expect(parsed.recipes[0]!.time).toBe("Temps : 10 min");
    expect(parsed.recipes[0]!.sections[0]!.items).toEqual(["eau"]);
  });

  it("rattache une puce sans section à l'intro de la recette", () => {
    const parsed = parseChefMessage(["**Soupe**", "- rapide et chaude"].join("\n"));
    expect(parsed.recipes[0]!.intro).toBe("rapide et chaude");
  });

  it("ajoute une ligne libre à la dernière section ouverte", () => {
    const parsed = parseChefMessage(
      ["**Soupe**", "📝 Ingrédients :", "- eau", "", "Note finale"].join("\n"),
    );
    expect(parsed.recipes[0]!.sections[0]!.items).toEqual(["eau", "Note finale"]);
  });

  it("accepte des étapes non numérotées", () => {
    const parsed = parseChefMessage(
      ["**Soupe**", "👨‍🍳 Étapes :", "Faire bouillir", "Servir"].join("\n"),
    );
    expect(parsed.recipes[0]!.sections[0]!.items).toEqual(["Faire bouillir", "Servir"]);
  });
});
