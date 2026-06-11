import { z } from "zod";

const MISTRAL_CHAT_URL = "https://api.mistral.ai/v1/chat/completions";
const DEFAULT_MODEL = "mistral-small-latest";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** Incrémenter quand le prompt change pour invalider l'ancien cache. */
const PROMPT_VERSION = 3;

export function normalizeIngredientName(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, " ")
    .trim();
}

/** Retire quantité / unité en fin de ligne (« Patates 2 kg » → « Patates »). */
export function ingredientTitleFromLine(line: string): string {
  return line
    .replace(/\s+\d+([.,]\d+)?(\s+(kg|l|g|ml|cl|pi[eè]ces?))?$/i, "")
    .trim();
}

type IngredientConstraints = {
  hasPotato: boolean;
  hasSweetPotato: boolean;
  clarifications: string[];
};

export function buildIngredientConstraints(ingredients: string[]): IngredientConstraints {
  const titles = ingredients.map(ingredientTitleFromLine);
  const norms = titles.map(normalizeIngredientName);

  const hasSweetPotato = norms.some(
    (n) => n.includes("patate douce") || n.includes("patates douces"),
  );
  const hasPotato = norms.some((n) => {
    if (n.includes("douce")) return false;
    return (
      n === "patate" ||
      n === "patates" ||
      n.includes("pomme de terre") ||
      n.includes("pommes de terre")
    );
  });

  const clarifications: string[] = [];
  if (hasPotato && !hasSweetPotato) {
    clarifications.push(
      "« patate » / « patates » = pommes de terre classiques. N'utilise JAMAIS de patate douce.",
    );
  }
  if (hasSweetPotato && !hasPotato) {
    clarifications.push(
      "Seules des patates douces sont listées. N'utilise pas de pommes de terre classiques.",
    );
  }

  return { hasPotato, hasSweetPotato, clarifications };
}

export function formatIngredientForPrompt(line: string, constraints: IngredientConstraints): string {
  const title = ingredientTitleFromLine(line);
  const norm = normalizeIngredientName(title);

  if (
    constraints.hasPotato &&
    !constraints.hasSweetPotato &&
    (norm === "patate" ||
      norm === "patates" ||
      norm.includes("pomme de terre") ||
      norm.includes("pommes de terre"))
  ) {
    return `${line} (= pommes de terre, PAS patate douce)`;
  }
  if (
    constraints.hasSweetPotato &&
    !constraints.hasPotato &&
    (norm.includes("patate douce") || norm.includes("patates douces"))
  ) {
    return `${line} (= patate douce, PAS pomme de terre)`;
  }
  return line;
}

const SWEET_POTATO_RE =
  /\b(patates?\s+douces?|sweet\s+potatoes?|ignames?\s+douces?)\b/i;
const CLASSIC_POTATO_RE =
  /\b(pommes?\s+de\s+terre|pommes?\s+terre|rosti|gratin\s+dauphinois)\b/i;

function recipeFullText(recipe: RecipeSuggestion): string {
  return [recipe.title, ...recipe.usedIngredients, ...recipe.steps, ...recipe.missingIngredients].join(
    " ",
  );
}

function violatesIngredientConstraints(
  recipe: RecipeSuggestion,
  constraints: IngredientConstraints,
): boolean {
  const text = recipeFullText(recipe);

  if (constraints.hasPotato && !constraints.hasSweetPotato && SWEET_POTATO_RE.test(text)) {
    return true;
  }
  if (constraints.hasSweetPotato && !constraints.hasPotato && CLASSIC_POTATO_RE.test(text)) {
    return true;
  }
  return false;
}

function filterValidRecipes(
  recipes: RecipeSuggestion[],
  constraints: IngredientConstraints,
): RecipeSuggestion[] {
  return recipes.filter((recipe) => !violatesIngredientConstraints(recipe, constraints));
}

export const recipeSuggestionSchema = z.object({
  title: z.string().min(1).max(120),
  usedIngredients: z.array(z.string().max(80)).max(20),
  missingIngredients: z.array(z.string().max(80)).max(15),
  prepTimeMinutes: z.number().int().min(1).max(480).optional(),
  steps: z.array(z.string().min(1).max(400)).min(1).max(8),
});

export const recipeSuggestionsResponseSchema = z.object({
  recipes: z.array(recipeSuggestionSchema).min(1).max(6),
});

export type RecipeSuggestion = z.infer<typeof recipeSuggestionSchema>;

type CacheEntry = { data: RecipeSuggestion[]; expiresAt: number };

const cache = new Map<string, CacheEntry>();

function cacheKey(listId: string, ingredients: string[]): string {
  return `v${PROMPT_VERSION}:${listId}:${ingredients.map((i) => i.toLowerCase()).sort().join("|")}`;
}

function getCached(key: string): RecipeSuggestion[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: RecipeSuggestion[]): void {
  if (cache.size > 500) cache.clear();
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Réponse IA sans JSON valide");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

async function callMistral(
  apiKey: string,
  model: string,
  ingredients: string[],
  limit: number,
  refresh: boolean,
  constraints: IngredientConstraints,
  strict: boolean,
): Promise<RecipeSuggestion[]> {
  const res = await fetch(MISTRAL_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: strict ? 0.5 : refresh ? 0.9 : 0.75,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Tu réponds uniquement en JSON valide. Recettes en français, créatives mais réalistes. Respecte strictement les ingrédients fournis sans les confondre ni les substituer.",
        },
        {
          role: "user",
          content: buildPrompt(ingredients, limit, refresh, constraints, strict),
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new Error("Limite Mistral atteinte. Réessayez dans une minute.");
    }
    console.error("[mistral] HTTP", res.status, body.slice(0, 500));
    throw new Error("Service de suggestions temporairement indisponible.");
  }

  const payload = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Réponse IA vide");

  const parsed = recipeSuggestionsResponseSchema.parse(extractJsonObject(content));
  return parsed.recipes;
}

function buildPrompt(
  ingredients: string[],
  limit: number,
  refresh: boolean,
  constraints: IngredientConstraints,
  strict = false,
): string {
  const list = ingredients
    .map((i) => `- ${formatIngredientForPrompt(i, constraints)}`)
    .join("\n");
  const clarifications =
    constraints.clarifications.length > 0
      ? `\nPrécisions obligatoires sur la liste :\n${constraints.clarifications.map((c) => `- ${c}`).join("\n")}\n`
      : "";
  const varietyHint = refresh
    ? "L'utilisateur a déjà vu des suggestions : propose des plats DIFFÉRENTS, plus originaux."
    : "";
  const strictHint = strict
    ? "CORRECTION : ta réponse précédente confondait des ingrédients (ex. patate vs patate douce). Respecte STRICTEMENT les libellés ci-dessus."
    : "";

  return `Tu es un chef créatif pour un foyer français. Voici les ingrédients achetés (base de travail) :

${list}
${clarifications}
${varietyHint}
${strictHint}

Règles importantes :
1. Chaque plat doit utiliser AU MOINS 1 ingrédient de la liste (de préférence 2+). Tu n'es PAS obligé d'utiliser tous les ingrédients dans chaque plat.
2. Respecte EXACTEMENT les ingrédients listés : ne substitue pas un article par un cousin (patate ≠ patate douce, beurre ≠ margarine, etc.).
3. Varie fortement les ${limit} propositions : styles, techniques et saveurs différents (gratin, mijoté, tarte salée, bowl, sauce, marinade, curry, méditerranéen, etc.).
4. ÉVITE les combinaisons trop évidentes ou plates. Exemple : avec steak, patates et tomates, NE propose PAS simplement « steak-frites », « salade de tomates » ou « purée avec steak ».
5. Propose des idées intéressantes mais réalisables à la maison en 15–60 min.
6. usedIngredients : reprends les noms des articles de la liste tels qu'achetés (sans les confondre).
7. missingIngredients : uniquement des compléments courants (sel, poivre, huile, ail, oignon, herbes, épices…), max 6 par plat.

Diversité attendue :
- au moins 1 plat centré sur un seul ingrédient principal de la liste ;
- au moins 1 plat qui combine plusieurs ingrédients de façon inventive ;
- des titres précis et appétissants (pas génériques).

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni texte autour :
{
  "recipes": [
    {
      "title": "Nom du plat",
      "usedIngredients": ["ingrédient 1", "ingrédient 2"],
      "missingIngredients": ["sel", "huile"],
      "prepTimeMinutes": 25,
      "steps": ["Étape 1", "Étape 2"]
    }
  ]
}`;
}

export async function suggestRecipesFromIngredients(params: {
  listId: string;
  ingredients: string[];
  limit?: number;
  /** Ignore le cache pour obtenir de nouvelles idées (ex. bouton Actualiser). */
  refresh?: boolean;
}): Promise<{ recipes: RecipeSuggestion[]; cached: boolean }> {
  const ingredients = params.ingredients
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);

  if (ingredients.length < 2) {
    throw new Error("Ajoutez au moins 2 articles à la liste pour obtenir des idées.");
  }

  const limit = Math.min(Math.max(params.limit ?? 4, 1), 6);
  const refresh = params.refresh === true;
  const key = cacheKey(params.listId, ingredients);
  if (!refresh) {
    const cached = getCached(key);
    if (cached) return { recipes: cached.slice(0, limit), cached: true };
  }

  const apiKey = process.env.MISTRAL_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Suggestions repas indisponibles (MISTRAL_API_KEY non configurée).");
  }

  const model = process.env.MISTRAL_MODEL?.trim() || DEFAULT_MODEL;
  const constraints = buildIngredientConstraints(ingredients);

  let recipes = await callMistral(apiKey, model, ingredients, limit, refresh, constraints, false);
  recipes = filterValidRecipes(recipes, constraints);

  if (recipes.length < Math.min(limit, 2)) {
    const retry = await callMistral(apiKey, model, ingredients, limit, refresh, constraints, true);
    recipes = filterValidRecipes(retry, constraints);
  }

  if (recipes.length === 0) {
    throw new Error("Impossible de générer des suggestions cohérentes avec votre liste.");
  }

  if (!refresh) setCache(key, recipes);
  return { recipes: recipes.slice(0, limit), cached: false };
}
