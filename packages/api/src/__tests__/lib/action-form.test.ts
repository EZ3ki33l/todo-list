import { describe, expect, it } from "vitest";

import {
  combineDueDateTime,
  isDateOnlyDueAt,
  resolveRemindBeforeMinutes,
} from "../../lib/action-form";

describe("combineDueDateTime", () => {
  it("combine date et heure correctement", () => {
    const iso = combineDueDateTime("2025-06-10", "14:30");
    const d = new Date(iso);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(5); // juin = 5
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });

  it("utilise minuit si aucune heure fournie", () => {
    const iso = combineDueDateTime("2025-06-10");
    const d = new Date(iso);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it("utilise minuit si heure invalide", () => {
    const iso = combineDueDateTime("2025-06-10", "invalid");
    const d = new Date(iso);
    expect(d.getHours()).toBe(0);
  });
});

describe("isDateOnlyDueAt", () => {
  it("retourne true pour minuit (date seule)", () => {
    expect(isDateOnlyDueAt(new Date("2025-06-10T00:00:00"))).toBe(true);
  });

  it("retourne true pour midi (ancien défaut)", () => {
    expect(isDateOnlyDueAt(new Date("2025-06-10T12:00:00"))).toBe(true);
  });

  it("retourne false pour une heure précise", () => {
    expect(isDateOnlyDueAt(new Date("2025-06-10T14:30:00"))).toBe(false);
  });

  it("retourne false pour null et undefined", () => {
    expect(isDateOnlyDueAt(null)).toBe(false);
    expect(isDateOnlyDueAt(undefined)).toBe(false);
  });
});

describe("resolveRemindBeforeMinutes", () => {
  it("retourne null pour preset 'none'", () => {
    expect(resolveRemindBeforeMinutes("none", 0, "hours")).toBeNull();
  });

  it("retourne les minutes du preset '15m'", () => {
    expect(resolveRemindBeforeMinutes("15m", 0, "hours")).toBe(15);
  });

  it("retourne les minutes du preset '1h'", () => {
    expect(resolveRemindBeforeMinutes("1h", 0, "hours")).toBe(60);
  });

  it("retourne les minutes du preset '1d'", () => {
    expect(resolveRemindBeforeMinutes("1d", 0, "hours")).toBe(60 * 24);
  });

  it("calcule correctement le custom en heures", () => {
    expect(resolveRemindBeforeMinutes("custom", 2, "hours")).toBe(120);
  });

  it("calcule correctement le custom en jours", () => {
    expect(resolveRemindBeforeMinutes("custom", 3, "days")).toBe(3 * 60 * 24);
  });

  it("retourne null si customAmount invalide", () => {
    expect(resolveRemindBeforeMinutes("custom", 0, "hours")).toBeNull();
    expect(resolveRemindBeforeMinutes("custom", -1, "hours")).toBeNull();
  });
});
