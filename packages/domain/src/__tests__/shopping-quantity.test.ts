import { describe, expect, it } from "vitest";

import { parseQuantity } from "../shopping-quantity";

describe("parseQuantity", () => {
  it("retourne null pour une chaîne vide", () => {
    expect(parseQuantity("")).toBeNull();
    expect(parseQuantity("  ")).toBeNull();
  });

  it("parse un entier", () => {
    expect(parseQuantity("3")).toBe(3);
  });

  it("parse un flottant avec point", () => {
    expect(parseQuantity("1.5")).toBe(1.5);
  });

  it("parse un flottant avec virgule (format fr)", () => {
    expect(parseQuantity("2,5")).toBe(2.5);
  });

  it("retourne null pour zéro", () => {
    expect(parseQuantity("0")).toBeNull();
  });

  it("retourne null pour une valeur négative", () => {
    expect(parseQuantity("-1")).toBeNull();
  });

  it("retourne null pour du texte non numérique", () => {
    expect(parseQuantity("abc")).toBeNull();
  });

  it("trim les espaces avant de parser", () => {
    expect(parseQuantity("  4  ")).toBe(4);
  });
});
