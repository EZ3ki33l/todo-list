import { describe, expect, it } from "vitest";

import { detectCategory } from "./grocery-detect";

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
