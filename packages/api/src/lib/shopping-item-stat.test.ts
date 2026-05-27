import { describe, expect, it } from "vitest";

import { normalizeItemTitle } from "./shopping-item-stat";

describe("normalizeItemTitle", () => {
  it("normalise casse et accents", () => {
    expect(normalizeItemTitle("Tomates")).toBe("tomates");
    expect(normalizeItemTitle("  Crème  ")).toBe("creme");
  });
});
