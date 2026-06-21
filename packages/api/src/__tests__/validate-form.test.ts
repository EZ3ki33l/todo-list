import { describe, expect, it } from "vitest";

import {
  formatZodFormError,
  parseActionId,
  parseCreateActionForm,
  parseCreateListForm,
  parseListId,
  parseShareListForm,
  parseTitle,
  parseUpdateActionForm,
} from "../validate-form";

function cuid() {
  return "clq0000000000000000000000";
}

function fd(entries: Record<string, string | null>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    if (v !== null) form.append(k, v);
  }
  return form;
}

describe("parseCreateActionForm", () => {
  it("parse un formulaire minimal valide (DAILY sans dueAt)", () => {
    const result = parseCreateActionForm(
      fd({ listId: cuid(), title: "Faire la vaisselle", recurrence: "DAILY" }),
    );
    expect(result.title).toBe("Faire la vaisselle");
    expect(result.recurrence).toBe("DAILY");
    expect(result.recurrenceDow).toBeNull();
  });

  it("parse recurrenceDow correctement", () => {
    const result = parseCreateActionForm(
      fd({
        listId: cuid(),
        title: "Sport",
        recurrence: "WEEKLY",
        recurrenceDow: "1",
      }),
    );
    expect(result.recurrenceDow).toBe(1);
  });

  it("met recurrenceDow à null si vide (DAILY)", () => {
    const result = parseCreateActionForm(
      fd({ listId: cuid(), title: "Test", recurrence: "DAILY", recurrenceDow: "" }),
    );
    expect(result.recurrenceDow).toBeNull();
  });

  it("lève une erreur si listId manquant", () => {
    expect(() =>
      parseCreateActionForm(fd({ title: "Test", recurrence: "NONE" })),
    ).toThrow();
  });

  it("lève une erreur si titre vide", () => {
    expect(() =>
      parseCreateActionForm(fd({ listId: cuid(), title: "", recurrence: "NONE" })),
    ).toThrow();
  });
});

describe("parseUpdateActionForm", () => {
  it("parse un formulaire de mise à jour valide", () => {
    const result = parseUpdateActionForm(
      fd({ actionId: cuid(), title: "Nouveau titre", recurrence: "DAILY" }),
    );
    expect(result.title).toBe("Nouveau titre");
    expect(result.recurrence).toBe("DAILY");
  });

  it("lève une erreur si actionId manquant", () => {
    expect(() =>
      parseUpdateActionForm(fd({ title: "Test", recurrence: "NONE" })),
    ).toThrow();
  });
});

describe("parseCreateListForm", () => {
  it("parse un titre valide", () => {
    const result = parseCreateListForm(fd({ title: "Ma liste" }));
    expect(result.title).toBe("Ma liste");
  });

  it("lève une erreur si titre vide", () => {
    expect(() => parseCreateListForm(fd({ title: "" }))).toThrow();
  });
});

describe("parseShareListForm", () => {
  it("parse un partage valide avec email", () => {
    const result = parseShareListForm(
      fd({ listId: cuid(), emailOrId: "user@example.com", role: "membre" }),
    );
    expect(result.emailOrId).toBe("user@example.com");
    expect(result.role).toBe("membre");
  });

  it("lève une erreur si email invalide et pas CUID", () => {
    expect(() =>
      parseShareListForm(
        fd({ listId: cuid(), emailOrId: "notvalid", role: "membre" }),
      ),
    ).toThrow();
  });
});

describe("parseListId / parseActionId / parseTitle", () => {
  it("parseListId accepte un CUID valide", () => {
    expect(parseListId(cuid())).toBe(cuid());
  });

  it("parseListId rejette une chaîne non-CUID", () => {
    expect(() => parseListId("notacuid")).toThrow();
  });

  it("parseActionId accepte un CUID valide", () => {
    expect(parseActionId(cuid())).toBe(cuid());
  });

  it("parseTitle accepte un titre valide", () => {
    expect(parseTitle("Mes tâches")).toBe("Mes tâches");
  });

  it("parseTitle rejette un titre vide", () => {
    expect(() => parseTitle("")).toThrow();
  });
});

describe("formatZodFormError", () => {
  it("retourne le premier message d'erreur Zod", () => {
    try {
      parseTitle("");
    } catch (err) {
      const msg = formatZodFormError(err);
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it("retourne le message d'erreur brut pour une Error standard", () => {
    const msg = formatZodFormError(new Error("boom"));
    expect(msg).toBe("boom");
  });
});
