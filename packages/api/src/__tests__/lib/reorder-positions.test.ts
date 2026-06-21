import { describe, expect, it } from "vitest";

import { assertOrderedIdsMatch } from "../../lib/reorder-positions";

describe("assertOrderedIdsMatch", () => {
  it("ne lève pas d'erreur si les listes sont identiques (ordre différent)", () => {
    expect(() => assertOrderedIdsMatch(["a", "b", "c"], ["c", "a", "b"])).not.toThrow();
  });

  it("ne lève pas d'erreur si les listes sont identiques dans le même ordre", () => {
    expect(() => assertOrderedIdsMatch(["a", "b"], ["a", "b"])).not.toThrow();
  });

  it("lève BAD_REQUEST si les longueurs diffèrent", () => {
    expect(() => assertOrderedIdsMatch(["a", "b", "c"], ["a", "b"])).toThrow();
  });

  it("lève BAD_REQUEST si un ID est inconnu", () => {
    expect(() => assertOrderedIdsMatch(["a", "b"], ["a", "z"])).toThrow();
  });

  it("lève BAD_REQUEST si un ID est manquant", () => {
    expect(() => assertOrderedIdsMatch(["a", "b", "c"], ["a", "a", "b"])).toThrow();
  });

  it("fonctionne avec des listes vides", () => {
    expect(() => assertOrderedIdsMatch([], [])).not.toThrow();
  });
});
