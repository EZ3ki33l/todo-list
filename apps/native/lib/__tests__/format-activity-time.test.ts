import { describe, expect, it } from "vitest";

import { activityRoute, formatActivityTime } from "../format-activity-time";

describe("formatActivityTime", () => {
  it("retourne une chaîne pour une date récente", () => {
    const d = new Date(Date.now() - 30_000);
    const result = formatActivityTime(d);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("accepte une string ISO", () => {
    const d = new Date(Date.now() - 120_000).toISOString();
    const result = formatActivityTime(d);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("retourne une date formatée pour une date > 7 jours", () => {
    const d = new Date(Date.now() - 10 * 86_400_000);
    const result = formatActivityTime(d);
    expect(/\d/.test(result)).toBe(true);
  });

  it("gère une date future", () => {
    const d = new Date(Date.now() + 3_600_000);
    const result = formatActivityTime(d);
    expect(typeof result).toBe("string");
  });
});

describe("activityRoute", () => {
  it("retourne null si listId ou listKind manquant", () => {
    expect(activityRoute(null, "abc")).toBeNull();
    expect(activityRoute("TODO", null)).toBeNull();
    expect(activityRoute(undefined, undefined)).toBeNull();
  });

  it("retourne la route native vers une liste TODO", () => {
    expect(activityRoute("TODO", "list123")).toBe("/(app)/lists/list123");
  });

  it("retourne la route native vers une liste SHOPPING", () => {
    expect(activityRoute("SHOPPING", "list456")).toBe("/(app)/shopping/list456");
  });
});
