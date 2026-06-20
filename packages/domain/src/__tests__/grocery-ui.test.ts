import { describe, expect, it, vi } from "vitest";

import type { GroceryCategory } from "../grocery-detect";
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  itemIcon,
  PICKABLE_CATEGORIES,
  SHOPPING_UNITS,
} from "../grocery-ui";

vi.mock("@repo/emoji", () => ({
  resolveItemEmojiFromTitle: (title: string) =>
    title === "tomate" ? "🍅" : null,
}));

describe("CATEGORY_LABELS", () => {
  it("couvre toutes les catégories", () => {
    const categories: GroceryCategory[] = [
      "LEGUME", "FRUIT", "VIANDE", "POISSON", "BOULANGERIE",
      "EPICERIE", "LAITIER", "BOISSON", "HYGIENE", "AUTRE",
    ];
    for (const cat of categories) {
      expect(CATEGORY_LABELS[cat]).toBeTruthy();
    }
  });
});

describe("CATEGORY_ICONS", () => {
  it("chaque catégorie a un emoji non vide", () => {
    for (const cat of PICKABLE_CATEGORIES) {
      expect(CATEGORY_ICONS[cat]).toBeTruthy();
    }
  });
});

describe("PICKABLE_CATEGORIES", () => {
  it("contient 10 catégories", () => {
    expect(PICKABLE_CATEGORIES).toHaveLength(10);
  });

  it("inclut AUTRE", () => {
    expect(PICKABLE_CATEGORIES).toContain("AUTRE");
  });
});

describe("SHOPPING_UNITS", () => {
  it("contient une option nulle (aucune unité)", () => {
    expect(SHOPPING_UNITS.some((u) => u.value === null)).toBe(true);
  });

  it("contient kg, L, pièce", () => {
    const values = SHOPPING_UNITS.map((u) => u.value);
    expect(values).toContain("kg");
    expect(values).toContain("L");
    expect(values).toContain("pièce");
  });
});

describe("itemIcon", () => {
  it("retourne l'icon personnalisé si fourni", () => {
    expect(itemIcon("LEGUME", "🌽")).toBe("🌽");
  });

  it("résout l'emoji à partir du titre si pas d'icon", () => {
    expect(itemIcon("LEGUME", null, "tomate")).toBe("🍅");
  });

  it("retourne l'icône de catégorie en fallback", () => {
    expect(itemIcon("LEGUME", null, "inconnu")).toBe(CATEGORY_ICONS["LEGUME"]);
    expect(itemIcon("AUTRE", null, null)).toBe(CATEGORY_ICONS["AUTRE"]);
  });

  it("retourne l'icône de catégorie si title résout en null", () => {
    expect(itemIcon("BOISSON", null, "aucunresultat")).toBe(CATEGORY_ICONS["BOISSON"]);
  });
});
