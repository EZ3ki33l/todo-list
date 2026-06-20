import { describe, expect, it } from "vitest";

import { applyListOrder } from "../reorder-list";

const items = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Beta" },
  { id: "c", name: "Gamma" },
];

describe("applyListOrder", () => {
  it("réordonne selon orderedIds", () => {
    expect(applyListOrder(items, ["c", "a", "b"])).toEqual([
      { id: "c", name: "Gamma" },
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
    ]);
  });

  it("retourne l'ordre identique si orderedIds correspond déjà", () => {
    expect(applyListOrder(items, ["a", "b", "c"])).toEqual(items);
  });

  it("ignore les IDs absents dans rows", () => {
    expect(applyListOrder(items, ["a", "z", "b"])).toEqual([
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
    ]);
  });

  it("retourne un tableau vide si orderedIds est vide", () => {
    expect(applyListOrder(items, [])).toEqual([]);
  });

  it("retourne un tableau vide si rows est vide", () => {
    expect(applyListOrder([], ["a", "b"])).toEqual([]);
  });

  it("gère les doublons dans orderedIds en les incluant deux fois", () => {
    expect(applyListOrder(items, ["a", "a", "b"])).toEqual([
      { id: "a", name: "Alpha" },
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
    ]);
  });

  it("préserve les propriétés de l'objet original", () => {
    const rich = [
      { id: "x", title: "T", done: false, count: 42 },
      { id: "y", title: "U", done: true, count: 0 },
    ];
    const result = applyListOrder(rich, ["y", "x"]);
    expect(result[0]).toEqual({ id: "y", title: "U", done: true, count: 0 });
    expect(result[1]).toEqual({ id: "x", title: "T", done: false, count: 42 });
  });
});
