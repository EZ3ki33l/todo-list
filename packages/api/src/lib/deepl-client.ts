const FETCH_TIMEOUT_MS = 8_000;
const MAX_TEXTS_PER_REQUEST = 50;

let warnedMissingKey = false;

/**
 * DeepL traduit mal certains mots anglais isolés, sans contexte (ex. un ingrédient
 * seul dans une liste) : il choisit le sens le plus courant, pas le sens culinaire.
 * Vérifié empiriquement : « Oil » → « Pétrole », « Swede » → « Suédois »,
 * « Dressing » → « Vêtements », « Rocket » → « Fusée », « Stock » laissé tel quel.
 * Ces mots restent corrects une fois dans un nom composé (« Vegetable Oil » → bon),
 * donc l'override ne s'applique qu'en correspondance exacte, pas en sous-chaîne.
 */
const AMBIGUOUS_WORD_OVERRIDES: Record<string, string> = {
  oil: "Huile",
  stock: "Bouillon",
  mince: "Viande hachée",
  greens: "Légumes verts",
  dressing: "Vinaigrette",
  rocket: "Roquette",
  squash: "Courge",
  swede: "Rutabaga",
};

function overrideFor(text: string): string | null {
  return AMBIGUOUS_WORD_OVERRIDES[text.trim().toLowerCase()] ?? null;
}

function apiKey(): string | null {
  const key = process.env.DEEPL_API_KEY?.trim();
  return key ? key : null;
}

function baseUrl(key: string): string {
  return key.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function translateChunk(texts: string[], key: string): Promise<string[]> {
  const params = new URLSearchParams();
  for (const text of texts) params.append("text", text);
  params.set("target_lang", "FR");
  params.set("source_lang", "EN");

  const res = await fetch(baseUrl(key), {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[deepl] HTTP", res.status, body.slice(0, 500));
    throw new Error("Service de traduction temporairement indisponible.");
  }

  const payload = (await res.json()) as { translations?: Array<{ text?: string }> };
  const translations = payload.translations ?? [];
  if (translations.length !== texts.length) {
    throw new Error("Réponse DeepL incohérente.");
  }
  return translations.map((t, i) => t.text?.trim() || texts[i]!);
}

/**
 * Traduit vers le français. Renvoie les textes d'origine (sans lever d'erreur) si
 * DEEPL_API_KEY est absente ou si l'appel échoue : le catalogue reste utilisable en anglais.
 */
export async function translateToFrench(texts: string[]): Promise<string[]> {
  const nonEmpty = texts.filter((t) => t.trim());
  if (nonEmpty.length === 0) return texts;

  const result: string[] = texts.map((text) => overrideFor(text) ?? text);
  const pending = texts
    .map((text, index) => ({ text, index }))
    .filter(({ text, index }) => text.trim() && result[index] === text);
  if (pending.length === 0) return result;

  const key = apiKey();
  if (!key) {
    if (!warnedMissingKey) {
      console.warn("[deepl] DEEPL_API_KEY non configurée : catalogue non traduit.");
      warnedMissingKey = true;
    }
    return result;
  }

  try {
    const batches = chunk(pending, MAX_TEXTS_PER_REQUEST);
    const translatedBatches = await Promise.all(
      batches.map((batch) => translateChunk(batch.map((p) => p.text), key)),
    );
    const translated = translatedBatches.flat();
    pending.forEach(({ index }, i) => {
      result[index] = translated[i] ?? result[index]!;
    });
    return result;
  } catch (err) {
    console.error("[deepl] traduction échouée", err);
    return result;
  }
}
