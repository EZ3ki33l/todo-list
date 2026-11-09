import { afterEach, describe, expect, it, vi } from "vitest";

import { translateToFrench } from "./deepl-client";

const ORIGINAL_ENV = process.env.DEEPL_API_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  if (ORIGINAL_ENV === undefined) delete process.env.DEEPL_API_KEY;
  else process.env.DEEPL_API_KEY = ORIGINAL_ENV;
});

describe("translateToFrench", () => {
  it("renvoie les textes d'origine si la clé n'est pas configurée", async () => {
    delete process.env.DEEPL_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await translateToFrench(["Chicken", "Potato"]);
    expect(result).toEqual(["Chicken", "Potato"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("appelle l'API DeepL free avec une clé « :fx »", async () => {
    process.env.DEEPL_API_KEY = "abc:fx";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ translations: [{ text: "Poulet" }, { text: "Pomme de terre" }] }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await translateToFrench(["Chicken", "Potato"]);
    expect(result).toEqual(["Poulet", "Pomme de terre"]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://api-free.deepl.com/v2/translate");
    expect(String(init.headers.Authorization)).toBe("DeepL-Auth-Key abc:fx");
  });

  it("appelle l'API DeepL pro sans suffixe « :fx »", async () => {
    process.env.DEEPL_API_KEY = "abc";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ translations: [{ text: "Poulet" }] }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await translateToFrench(["Chicken"]);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://api.deepl.com/v2/translate");
  });

  it("renvoie les textes d'origine si l'appel échoue", async () => {
    process.env.DEEPL_API_KEY = "abc:fx";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, text: async () => "boom" })),
    );

    const result = await translateToFrench(["Chicken"]);
    expect(result).toEqual(["Chicken"]);
  });

  it("renvoie les textes d'origine si la réponse est incohérente", async () => {
    process.env.DEEPL_API_KEY = "abc:fx";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ translations: [] }) })),
    );

    const result = await translateToFrench(["Chicken", "Potato"]);
    expect(result).toEqual(["Chicken", "Potato"]);
  });

  it("découpe les envois de plus de 50 textes en plusieurs requêtes", async () => {
    process.env.DEEPL_API_KEY = "abc:fx";
    const texts = Array.from({ length: 120 }, (_, i) => `word${i}`);
    const fetchMock = vi.fn(async (_url: string, init: { body: URLSearchParams }) => {
      const count = init.body.getAll("text").length;
      return {
        ok: true,
        json: async () => ({
          translations: Array.from({ length: count }, (_, i) => ({ text: `mot${i}` })),
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await translateToFrench(texts);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(120);
  });

  it("corrige les mots isolés que DeepL traduit mal hors contexte, sans appel réseau", async () => {
    delete process.env.DEEPL_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await translateToFrench(["Oil", "Swede", "Dressing", "Rocket"]);
    expect(result).toEqual(["Huile", "Rutabaga", "Vinaigrette", "Roquette"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("n'envoie à DeepL que les textes non couverts par les corrections", async () => {
    process.env.DEEPL_API_KEY = "abc:fx";
    const fetchMock = vi.fn(async (_url: string, init: { body: URLSearchParams }) => ({
      ok: true,
      json: async () => ({
        translations: init.body.getAll("text").map((t) => ({ text: `[${t}]` })),
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await translateToFrench(["Oil", "Chicken Breast"]);
    expect(result).toEqual(["Huile", "[Chicken Breast]"]);
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init as { body: URLSearchParams }).body.getAll("text")).toEqual(["Chicken Breast"]);
  });

  it("laisse un mot ambigu intact quand il fait partie d'un nom composé", async () => {
    process.env.DEEPL_API_KEY = "abc:fx";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ translations: [{ text: "Huile végétale" }] }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await translateToFrench(["Vegetable Oil"]);
    expect(result).toEqual(["Huile végétale"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ne fait aucun appel pour une liste vide", async () => {
    process.env.DEEPL_API_KEY = "abc:fx";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await translateToFrench(["", "  "]);
    expect(result).toEqual(["", "  "]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
