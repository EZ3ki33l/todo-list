import { afterEach, describe, expect, it, vi } from "vitest";

import { activityPathSegments, formatActivityTime } from "../activity-time";

const NOW = new Date(2026, 2, 12, 12, 0, 0);

afterEach(() => {
  vi.useRealTimers();
});

function at(msAgo: number): Date {
  return new Date(NOW.getTime() - msAgo);
}

describe("formatActivityTime", () => {
  it("formate secondes, minutes, heures et jours", () => {
    vi.useFakeTimers({ now: NOW });
    expect(formatActivityTime(at(5_000))).toMatch(/seconde|s$/);
    expect(formatActivityTime(at(5 * 60_000))).toMatch(/minute|min/);
    expect(formatActivityTime(at(5 * 3_600_000))).toMatch(/heure|h/);
    expect(formatActivityTime(at(3 * 86_400_000))).toMatch(/jour|j|avant-hier/);
  });

  it("bascule sur une date absolue au-delà d'une semaine", () => {
    vi.useFakeTimers({ now: NOW });
    expect(formatActivityTime(at(30 * 86_400_000))).toMatch(/\d/);
    expect(formatActivityTime(at(30 * 86_400_000))).not.toMatch(/il y a/);
  });

  it("accepte une date au format chaîne", () => {
    vi.useFakeTimers({ now: NOW });
    expect(formatActivityTime(at(60_000).toISOString())).toBe(
      formatActivityTime(at(60_000)),
    );
  });
});

describe("repli sans Intl.RelativeTimeFormat", () => {
  /** Hermes / certains Android n'exposent pas RelativeTimeFormat. */
  async function withoutRelativeTimeFormat() {
    // Les faux timers ont besoin du reste d'Intl : on masque le seul membre absent.
    vi.useFakeTimers({ now: NOW });
    vi.resetModules();
    vi.stubGlobal(
      "Intl",
      new Proxy(Intl, {
        get: (target, prop) =>
          prop === "RelativeTimeFormat" ? undefined : Reflect.get(target, prop),
      }),
    );
    return import("../activity-time");
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("formate avec des unités courtes", async () => {
    const { formatActivityTime: fallback } = await withoutRelativeTimeFormat();
    expect(fallback(at(5_000))).toBe("il y a 5 s");
    expect(fallback(at(5 * 60_000))).toBe("il y a 5 min");
    expect(fallback(at(5 * 3_600_000))).toBe("il y a 5 h");
    expect(fallback(at(3 * 86_400_000))).toBe("il y a 3 j");
  });

  it("gère aussi le futur et les dates lointaines", async () => {
    const { formatActivityTime: fallback } = await withoutRelativeTimeFormat();
    expect(fallback(at(-2 * 60_000))).toBe("dans 2 min");
    expect(fallback(at(30 * 86_400_000))).not.toMatch(/il y a/);
  });
});

describe("activityPathSegments", () => {
  it("route vers la bonne section", () => {
    expect(activityPathSegments("SHOPPING", "abc")).toBe("shopping/abc");
    expect(activityPathSegments("TODO", "abc")).toBe("lists/abc");
  });

  it("retourne null si la cible est incomplète", () => {
    expect(activityPathSegments("TODO", null)).toBeNull();
    expect(activityPathSegments(null, "abc")).toBeNull();
    expect(activityPathSegments(undefined, undefined)).toBeNull();
  });
});
