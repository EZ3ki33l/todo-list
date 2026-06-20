import { describe, expect, it } from "vitest";

import { activityHref, formatActivityTime } from "../format-activity-time";

function dateSecondsAgo(n: number): Date {
  return new Date(Date.now() - n * 1000);
}

function dateDaysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

describe("formatActivityTime", () => {
  it("retourne une chaîne non vide pour un date récente", () => {
    const result = formatActivityTime(dateSecondsAgo(30));
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("accepte une date sous forme de string ISO", () => {
    const result = formatActivityTime(new Date(Date.now() - 60_000).toISOString());
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("retourne une date formatée pour une date ancienne (> 7 jours)", () => {
    const result = formatActivityTime(dateDaysAgo(10));
    // Doit contenir un chiffre (le jour)
    expect(/\d/.test(result)).toBe(true);
  });

  it("retourne une format relatif pour une date d'hier", () => {
    const result = formatActivityTime(dateDaysAgo(1));
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("activityHref", () => {
  it("retourne null si listId ou listKind est absent", () => {
    expect(activityHref(null, "abc")).toBeNull();
    expect(activityHref("TODO", null)).toBeNull();
    expect(activityHref(undefined, undefined)).toBeNull();
  });

  it("retourne le lien vers une liste TODO", () => {
    const href = activityHref("TODO", "clq0000000000000000000000");
    expect(href).toBe("/dashboard/lists/clq0000000000000000000000");
  });

  it("retourne le lien vers une liste SHOPPING", () => {
    const href = activityHref("SHOPPING", "clq0000000000000000000000");
    expect(href).toBe("/dashboard/shopping/clq0000000000000000000000");
  });
});
