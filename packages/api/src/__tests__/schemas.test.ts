import { describe, expect, it } from "vitest";

import {
  cuidSchema,
  createActionInput,
  createListInput,
  dueAtSchema,
  emailOrIdSchema,
  groceryCategoryEnum,
  iconSchema,
  idTokenSchema,
  listStatusEnum,
  memberRoleEnum,
  notesSchema,
  orderedIdsSchema,
  pushPlatformEnum,
  pushTokenSchema,
  quantitySchema,
  recurrenceEnum,
  recurrenceTimeSchema,
  remindBeforeMinutesSchema,
  renameListInput,
  shareListInput,
  shoppingItemInputSchema,
  titleSchema,
  unitSchema,
} from "../schemas";

// ── Helpers ────────────────────────────────────────────────────────────────────

function validCuid() {
  return "clq0000000000000000000000";
}

function pass<T>(schema: { parse: (v: unknown) => T }, value: unknown) {
  return () => schema.parse(value);
}

function fail(schema: { parse: (v: unknown) => unknown }, value: unknown) {
  return () => schema.parse(value);
}

// ── Primitives ─────────────────────────────────────────────────────────────────

describe("recurrenceEnum", () => {
  it.each(["NONE", "DAILY", "WEEKLY"])("accepte %s", (v) => {
    expect(() => recurrenceEnum.parse(v)).not.toThrow();
  });
  it("rejette une valeur invalide", () => {
    expect(fail(recurrenceEnum, "MONTHLY")).toThrow();
  });
});

describe("listStatusEnum", () => {
  it.each(["ACTIVE", "ARCHIVED", "DONE"])("accepte %s", (v) => {
    expect(() => listStatusEnum.parse(v)).not.toThrow();
  });
  it("rejette une valeur invalide", () => {
    expect(fail(listStatusEnum, "DELETED")).toThrow();
  });
});

describe("memberRoleEnum", () => {
  it.each(["membre", "invité"])("accepte %s", (v) => {
    expect(() => memberRoleEnum.parse(v)).not.toThrow();
  });
  it("rejette admin", () => {
    expect(fail(memberRoleEnum, "admin")).toThrow();
  });
});

describe("pushPlatformEnum", () => {
  it.each(["android", "ios", "web"])("accepte %s", (v) => {
    expect(() => pushPlatformEnum.parse(v)).not.toThrow();
  });
  it("rejette desktop", () => {
    expect(fail(pushPlatformEnum, "desktop")).toThrow();
  });
});

describe("titleSchema", () => {
  it("accepte un titre valide", () => {
    expect(pass(titleSchema, "Ma liste")()).toBe("Ma liste");
  });
  it("trim les espaces", () => {
    expect(titleSchema.parse("  hello  ")).toBe("hello");
  });
  it("rejette une chaîne vide", () => {
    expect(fail(titleSchema, "  ")).toThrow();
    expect(fail(titleSchema, "")).toThrow();
  });
  it("rejette plus de 200 caractères", () => {
    expect(fail(titleSchema, "a".repeat(201))).toThrow();
  });
  it("accepte exactement 200 caractères", () => {
    expect(() => titleSchema.parse("a".repeat(200))).not.toThrow();
  });
});

describe("idTokenSchema", () => {
  it("accepte un token long", () => {
    expect(() => idTokenSchema.parse("a".repeat(20))).not.toThrow();
  });
  it("rejette un token trop court", () => {
    expect(fail(idTokenSchema, "abc")).toThrow();
  });
});

describe("pushTokenSchema", () => {
  it("accepte un token valide", () => {
    expect(() => pushTokenSchema.parse("ExponentPushToken[xxx]")).not.toThrow();
  });
  it("rejette une chaîne vide", () => {
    expect(fail(pushTokenSchema, "")).toThrow();
  });
});

describe("quantitySchema", () => {
  it("accepte null", () => {
    expect(quantitySchema.parse(null)).toBeNull();
  });
  it("accepte un nombre positif", () => {
    expect(quantitySchema.parse(2.5)).toBe(2.5);
  });
  it("rejette zéro", () => {
    expect(fail(quantitySchema, 0)).toThrow();
  });
  it("rejette les négatifs", () => {
    expect(fail(quantitySchema, -1)).toThrow();
  });
  it("rejette un nombre trop grand", () => {
    expect(fail(quantitySchema, 100_000)).toThrow();
  });
});

describe("recurrenceTimeSchema", () => {
  it("accepte HH:MM valide", () => {
    expect(recurrenceTimeSchema.parse("08:30")).toBe("08:30");
    expect(recurrenceTimeSchema.parse("23:59")).toBe("23:59");
  });
  it("transforme vide et null en null", () => {
    expect(recurrenceTimeSchema.parse("")).toBeNull();
    expect(recurrenceTimeSchema.parse(null)).toBeNull();
    expect(recurrenceTimeSchema.parse(undefined)).toBeNull();
  });
  it("rejette un format invalide", () => {
    expect(fail(recurrenceTimeSchema, "25:00")).toThrow();
    expect(fail(recurrenceTimeSchema, "8:30")).toThrow();
  });
});

describe("dueAtSchema", () => {
  it("accepte une ISO datetime valide", () => {
    expect(() => dueAtSchema.parse("2025-01-15T10:00:00.000Z")).not.toThrow();
  });
  it("accepte null et undefined", () => {
    expect(dueAtSchema.parse(null)).toBeNull();
    expect(dueAtSchema.parse(undefined)).toBeUndefined();
  });
  it("rejette une date sans heure", () => {
    expect(fail(dueAtSchema, "2025-01-15")).toThrow();
  });
});

describe("notesSchema", () => {
  it("transforme chaîne vide en null", () => {
    expect(notesSchema.parse("")).toBeNull();
  });
  it("accepte du texte", () => {
    expect(notesSchema.parse("Note importante")).toBe("Note importante");
  });
  it("rejette plus de 5000 caractères", () => {
    expect(fail(notesSchema, "a".repeat(5001))).toThrow();
  });
});

describe("emailOrIdSchema", () => {
  it("accepte un email valide", () => {
    expect(() => emailOrIdSchema.parse("user@example.com")).not.toThrow();
  });
  it("accepte un CUID", () => {
    expect(() => emailOrIdSchema.parse(validCuid())).not.toThrow();
  });
  it("rejette du texte aléatoire", () => {
    expect(fail(emailOrIdSchema, "notanemail")).toThrow();
  });
});

describe("orderedIdsSchema", () => {
  it("accepte un tableau de CUIDs", () => {
    expect(() => orderedIdsSchema.parse([validCuid(), validCuid()])).not.toThrow();
  });
  it("rejette un tableau vide", () => {
    expect(fail(orderedIdsSchema, [])).toThrow();
  });
});

describe("groceryCategoryEnum", () => {
  const cats = ["LEGUME", "FRUIT", "VIANDE", "POISSON", "BOULANGERIE", "EPICERIE", "LAITIER", "BOISSON", "HYGIENE", "AUTRE"];
  it.each(cats)("accepte %s", (v) => {
    expect(() => groceryCategoryEnum.parse(v)).not.toThrow();
  });
  it("rejette une catégorie inconnue", () => {
    expect(fail(groceryCategoryEnum, "UNKNOWN")).toThrow();
  });
});

describe("unitSchema", () => {
  it("accepte null et undefined", () => {
    expect(unitSchema.parse(null)).toBeNull();
    expect(unitSchema.parse(undefined)).toBeUndefined();
  });
  it("trim les espaces", () => {
    expect(unitSchema.parse("  kg  ")).toBe("kg");
  });
  it("rejette plus de 20 caractères", () => {
    expect(fail(unitSchema, "a".repeat(21))).toThrow();
  });
});

describe("iconSchema", () => {
  it("accepte null et un emoji", () => {
    expect(iconSchema.parse(null)).toBeNull();
    expect(iconSchema.parse("🍅")).toBe("🍅");
  });
  it("rejette plus de 64 caractères", () => {
    expect(fail(iconSchema, "a".repeat(65))).toThrow();
  });
});

describe("remindBeforeMinutesSchema", () => {
  it("accepte null et des minutes valides", () => {
    expect(remindBeforeMinutesSchema.parse(null)).toBeNull();
    expect(remindBeforeMinutesSchema.parse(15)).toBe(15);
    expect(remindBeforeMinutesSchema.parse(60)).toBe(60);
  });
  it("rejette 0 ou négatif", () => {
    expect(fail(remindBeforeMinutesSchema, 0)).toThrow();
    expect(fail(remindBeforeMinutesSchema, -5)).toThrow();
  });
  it("rejette les non-entiers", () => {
    expect(fail(remindBeforeMinutesSchema, 1.5)).toThrow();
  });
});

describe("createListInput", () => {
  it("accepte un titre valide", () => {
    expect(createListInput.parse({ title: "Courses" })).toEqual({ title: "Courses" });
  });
  it("rejette titre absent", () => {
    expect(fail(createListInput, {})).toThrow();
  });
});

describe("renameListInput", () => {
  it("accepte listId et title", () => {
    expect(() => renameListInput.parse({ listId: validCuid(), title: "Nouveau" })).not.toThrow();
  });
  it("rejette si listId manquant", () => {
    expect(fail(renameListInput, { title: "Titre" })).toThrow();
  });
});

describe("shareListInput", () => {
  it("accepte email + role valide", () => {
    expect(() =>
      shareListInput.parse({
        listId: validCuid(),
        emailOrId: "user@example.com",
        role: "membre",
      }),
    ).not.toThrow();
  });
  it("rejette rôle invalide", () => {
    expect(fail(shareListInput, { listId: validCuid(), emailOrId: "a@b.com", role: "admin" })).toThrow();
  });
});

describe("createActionInput", () => {
  const futureDate = new Date(Date.now() + 86_400_000).toISOString(); // demain
  const base = {
    listId: validCuid(),
    title: "Faire les courses",
    recurrence: "NONE",
    dueAt: futureDate,
  };

  it("accepte un input ponctuel valide (NONE avec dueAt futur)", () => {
    expect(() => createActionInput.parse(base)).not.toThrow();
  });

  it("accepte recurrence DAILY sans dueAt", () => {
    expect(() =>
      createActionInput.parse({ listId: validCuid(), title: "Sport", recurrence: "DAILY", recurrenceTime: "08:00" }),
    ).not.toThrow();
  });

  it("accepte recurrence WEEKLY avec recurrenceDow", () => {
    expect(() =>
      createActionInput.parse({ listId: validCuid(), title: "Yoga", recurrence: "WEEKLY", recurrenceDow: 1 }),
    ).not.toThrow();
  });

  it("rejette NONE sans dueAt", () => {
    expect(fail(createActionInput, { listId: validCuid(), title: "Test", recurrence: "NONE" })).toThrow();
  });

  it("rejette un titre vide", () => {
    expect(fail(createActionInput, { ...base, title: "" })).toThrow();
  });

  it("rejette recurrence invalide", () => {
    expect(fail(createActionInput, { ...base, recurrence: "HOURLY" })).toThrow();
  });
});

describe("shoppingItemInputSchema", () => {
  const base = { title: "Tomates", category: "LEGUME" };

  it("accepte un input minimal", () => {
    expect(() => shoppingItemInputSchema.parse(base)).not.toThrow();
  });

  it("accepte avec quantité et unité", () => {
    expect(() =>
      shoppingItemInputSchema.parse({ ...base, quantity: 2, unit: "kg" }),
    ).not.toThrow();
  });

  it("utilise AUTRE comme catégorie par défaut", () => {
    const result = shoppingItemInputSchema.parse({ title: "Item" });
    expect(result.category).toBe("AUTRE");
  });

  it("rejette un titre vide", () => {
    expect(fail(shoppingItemInputSchema, { ...base, title: "" })).toThrow();
  });

  it("rejette une catégorie invalide", () => {
    expect(fail(shoppingItemInputSchema, { ...base, category: "FAKE" })).toThrow();
  });
});
