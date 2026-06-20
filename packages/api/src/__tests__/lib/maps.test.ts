import { describe, expect, it } from "vitest";

import { buildMapsSearchUrl, formatActionLocation, resolveMapsQuery } from "../../lib/maps";

describe("buildMapsSearchUrl", () => {
  it("encode correctement l'adresse", () => {
    const url = buildMapsSearchUrl("12 rue de la Paix, Paris");
    expect(url).toContain("google.com/maps");
    expect(url).toContain(encodeURIComponent("12 rue de la Paix, Paris"));
  });

  it("trim l'adresse avant encodage", () => {
    const url = buildMapsSearchUrl("  Paris  ");
    expect(url).toContain(encodeURIComponent("Paris"));
  });

  it("génère une URL bien formée", () => {
    const url = buildMapsSearchUrl("Lyon");
    expect(url).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?/);
    expect(url).toContain("query=Lyon");
  });
});

describe("formatActionLocation", () => {
  it("retourne 'label — adresse' si les deux sont définis", () => {
    expect(formatActionLocation("Bureau", "1 rue de la Paix")).toBe("Bureau — 1 rue de la Paix");
  });

  it("retourne seulement le label si pas d'adresse", () => {
    expect(formatActionLocation("Bureau", null)).toBe("Bureau");
    expect(formatActionLocation("Bureau", "")).toBe("Bureau");
  });

  it("retourne seulement l'adresse si pas de label", () => {
    expect(formatActionLocation(null, "1 rue de la Paix")).toBe("1 rue de la Paix");
    expect(formatActionLocation("", "1 rue de la Paix")).toBe("1 rue de la Paix");
  });

  it("retourne null si les deux sont vides", () => {
    expect(formatActionLocation(null, null)).toBeNull();
    expect(formatActionLocation("", "")).toBeNull();
    expect(formatActionLocation(undefined, undefined)).toBeNull();
  });
});

describe("resolveMapsQuery", () => {
  it("priorité à l'adresse complète", () => {
    expect(resolveMapsQuery("Bureau", "1 rue de la Paix")).toBe("1 rue de la Paix");
  });

  it("retourne le label si pas d'adresse", () => {
    expect(resolveMapsQuery("Bureau", null)).toBe("Bureau");
    expect(resolveMapsQuery("Bureau", "")).toBe("Bureau");
  });

  it("retourne null si rien", () => {
    expect(resolveMapsQuery(null, null)).toBeNull();
    expect(resolveMapsQuery("", "")).toBeNull();
    expect(resolveMapsQuery(undefined, undefined)).toBeNull();
  });
});
