import { z } from "zod";

import type { MistralMessage } from "./mistral-client";
import { mistralChat } from "./mistral-client";
import { getFrenchSeasonContext } from "./french-season";
import {
  buildIngredientConstraints,
  formatIngredientForPrompt,
  ingredientTitleFromLine,
  normalizeIngredientName,
} from "./recipe-suggestions";
import {
  CANONICAL_SEASONAL_SOURCES,
  formatSourcesForPrompt,
} from "./seasonal-produce-sources";

export type RecipeChatMode = "from_list" | "suggest_items" | "seasonal_produce";

export type RecipeChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type RecipeChatSource = {
  label: string;
  url?: string;
};

export type RecipeChatItemToAdd = {
  title: string;
  quantity: number | null;
  unit: string | null;
};

export type RecipeChatResult = {
  reply: string;
  sources: RecipeChatSource[];
  itemsToAdd: RecipeChatItemToAdd[];
};

const chatResponseSchema = z.object({
  reply: z.string().min(1).max(8000),
  sources: z
    .array(
      z.object({
        label: z.string().min(1).max(120),
        url: z.union([z.string().url().max(400), z.literal("")]).optional(),
      }),
    )
    .max(5)
    .default([]),
  itemsToAdd: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        quantity: z.number().nullable().optional(),
        unit: z.string().max(20).nullable().optional(),
      }),
    )
    .max(12)
    .default([]),
});

const JSON_RESPONSE_BASE = `

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown autour) :
{
  "reply": "Texte structuré pour l'affichage (voir format ci-dessous)",
  "sources": [{ "label": "Nom de la source", "url": "https://..." }],
  "itemsToAdd": [{ "title": "Nom article", "quantity": null, "unit": null }]
}

Règles JSON :
- sources : 1 à 3 références réelles (utilise les URLs fournies quand elles s'appliquent)
- itemsToAdd : articles à acheter qui ne sont PAS déjà sur la liste de l'utilisateur (max 8)
- quantity/unit : null si non précisé`;

const RECIPE_JSON_FORMAT = `

Format du champ reply (recettes / articles à acheter) :
- Phrase d'intro courte optionnelle
- Pour CHAQUE recette :
  **1. Titre du plat** (numéroté si plusieurs)
  ⏱️ Temps : X min
  📝 Ingrédients :
  - ingrédient 1
  👨‍🍳 Étapes :
  1. première étape
- Pas de pavé : sauts de ligne entre chaque bloc`;

const SEASONAL_JSON_FORMAT = `

Format du champ reply — PRODUITS UNIQUEMENT (calendrier de saison) :
- Intro courte optionnelle (1 phrase max, pas de recette)
- Pour chaque saison :
  **Printemps**
  Fruits : …
  Légumes : …
  **Été** … **Automne** … **Hiver** …

INTERDIT dans ce mode :
- recettes, plats, idées de repas, menus
- étapes de cuisine, temps de préparation, « vous pouvez faire… »
- titres de plats numérotés (pas de **1. Velouté…**)

itemsToAdd : noms de fruits ou légumes seuls (ex. « Courgettes », « Fraises »)`;

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

function titlesOnList(ingredients: string[]): Set<string> {
  const set = new Set<string>();
  for (const line of ingredients) {
    const title = ingredientTitleFromLine(line);
    set.add(normalizeIngredientName(title));
    for (const word of normalizeIngredientName(title).split(/\s+/)) {
      if (word.length > 2) set.add(word);
    }
  }
  return set;
}

function isAlreadyOnList(title: string, onList: Set<string>): boolean {
  const norm = normalizeIngredientName(title);
  if (onList.has(norm)) return true;
  for (const known of Array.from(onList)) {
    if (norm.includes(known) || known.includes(norm)) return true;
  }
  return false;
}

function filterItemsToAdd(
  items: RecipeChatItemToAdd[],
  ingredients: string[],
): RecipeChatItemToAdd[] {
  const onList = titlesOnList(ingredients);
  const seen = new Set<string>();
  const out: RecipeChatItemToAdd[] = [];

  for (const item of items) {
    const title = item.title.trim();
    if (!title) continue;
    const norm = normalizeIngredientName(title);
    if (seen.has(norm) || isAlreadyOnList(title, onList)) continue;
    seen.add(norm);
    out.push({
      title,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
    });
  }
  return out.slice(0, 8);
}

function mergeSources(
  mode: RecipeChatMode,
  fromModel: RecipeChatSource[],
): RecipeChatSource[] {
  const map = new Map<string, RecipeChatSource>();

  const add = (s: RecipeChatSource) => {
    const key = s.url ?? s.label;
    if (!map.has(key)) map.set(key, s);
  };

  if (mode === "seasonal_produce") {
    for (const s of CANONICAL_SEASONAL_SOURCES) add(s);
  }

  for (const s of fromModel) {
    const url = s.url?.trim() || undefined;
    add({ label: s.label.trim(), url });
  }

  if (map.size === 0) {
    add({
      label: "Suggestion Chef IA (Mistral)",
    });
  }

  return Array.from(map.values()).slice(0, 5);
}

function buildFromListSystemPrompt(ingredients: string[]): string {
  const constraints = buildIngredientConstraints(ingredients);
  const season = getFrenchSeasonContext();
  const list = ingredients
    .map((i) => `- ${formatIngredientForPrompt(i, constraints)}`)
    .join("\n");
  const clarifications =
    constraints.clarifications.length > 0
      ? `\nPrécisions obligatoires :\n${constraints.clarifications.map((c) => `- ${c}`).join("\n")}\n`
      : "";

  return `Tu es Chef IA, un assistant cuisine français sympathique et concis.

Nous sommes en ${season.label} (saison : ${season.season}).
L'utilisateur souhaite des RECETTES à partir des articles déjà sur sa liste de courses :
${list}
${clarifications}
Règles :
- Réponds en français, ton chaleureux et pratique
- Propose des recettes créatives mais réalisables (évite le trop évident)
- Privilégie les ingrédients de saison quand c'est pertinent
- Respecte EXACTEMENT les ingrédients listés (patate ≠ patate douce)
- Tu peux compléter avec des ingrédients courants (sel, huile, épices…) — mets-les dans itemsToAdd s'ils manquent à la liste
- Structure chaque recette dans reply : titre, temps, ingrédients, étapes
- sources : indique « Suggestion Chef IA » + éventuellement Manger Bouger si tu cites des produits de saison
${JSON_RESPONSE_BASE}${RECIPE_JSON_FORMAT}`;
}

function buildSuggestItemsSystemPrompt(ingredients: string[]): string {
  const season = getFrenchSeasonContext();
  const list =
    ingredients.length > 0
      ? ingredients.map((i) => `- ${i}`).join("\n")
      : "(liste vide pour l'instant)";

  return `Tu es Chef IA, un assistant cuisine français sympathique et concis.

Nous sommes en ${season.label} (saison : ${season.season}).
L'utilisateur souhaite savoir quels ARTICLES ajouter à sa liste de courses pour cuisiner.
Articles déjà présents :
${list}

Règles :
- Réponds en français, ton chaleureux et pratique
- Dans reply : sépare « Déjà dans votre liste » vs « À ajouter »
- itemsToAdd : uniquement ce qui manque à la liste
- Favorise les produits de saison
- sources : Manger Bouger ou Interfel si pertinent :
${formatSourcesForPrompt(CANONICAL_SEASONAL_SOURCES)}
${JSON_RESPONSE_BASE}${RECIPE_JSON_FORMAT}`;
}

function buildSeasonalProduceSystemPrompt(ingredients: string[]): string {
  const season = getFrenchSeasonContext();
  const list =
    ingredients.length > 0
      ? ingredients.map((i) => `- ${i}`).join("\n")
      : "(aucun article pour l'instant)";

  return `Tu es Chef IA, guide des fruits et légumes de saison en France (métropole).

Date actuelle : ${season.label} — saison en cours : **${season.season}**.
Articles déjà sur la liste :
${list}

Sources de référence OBLIGATOIRES (à inclure dans sources) :
${formatSourcesForPrompt(CANONICAL_SEASONAL_SOURCES)}

Règles STRICTES :
- Tu listes UNIQUEMENT des PRODUITS (fruits et légumes), jamais des recettes ni des plats
- Structure reply par saison : Printemps, Été, Automne, Hiver — chacune avec « Fruits : » et « Légumes : »
- Mets en avant la saison actuelle (${season.season}) en la plaçant en premier
- itemsToAdd : 3 à 8 fruits ou légumes de saison absents de la liste (noms courts, singulier ou pluriel courant)
- Base-toi sur les calendriers des sources ci-dessus, pas sur ton imagination
- Si l'utilisateur demande une recette, rappelle poliment que ce mode sert au calendrier des produits
${JSON_RESPONSE_BASE}${SEASONAL_JSON_FORMAT}`;
}

export function recipeChatWelcome(mode: RecipeChatMode, ingredientCount: number): string {
  const season = getFrenchSeasonContext();

  if (mode === "from_list") {
    if (ingredientCount < 2) {
      return "J'ai regardé votre liste — il y a peu d'articles pour l'instant. Ajoutez-en quelques-uns, ou décrivez ce que vous avez sous la main et je vous proposerai des idées !";
    }
    return `Parfait ! J'ai ${ingredientCount} article${ingredientCount > 1 ? "s" : ""} à travailler. Décrivez le style de repas que vous voulez (rapide, familial, léger…), ou dites « surprenez-moi » pour des idées créatives.`;
  }

  if (mode === "seasonal_produce") {
    return `Nous sommes en ${season.season} (${season.monthName}). Je vous liste les fruits et légumes de saison en France — pas de recettes ici, seulement les produits. Vous pourrez ajouter d'un clic ce qui manque à votre liste.`;
  }

  return "Quel plat ou repas avez-vous en tête ? Je vous dirai quoi ajouter à votre liste, avec des sources.";
}

function buildSystemPrompt(mode: RecipeChatMode, ingredients: string[]): string {
  switch (mode) {
    case "from_list":
      return buildFromListSystemPrompt(ingredients);
    case "suggest_items":
      return buildSuggestItemsSystemPrompt(ingredients);
    case "seasonal_produce":
      return buildSeasonalProduceSystemPrompt(ingredients);
  }
}

export async function runRecipeChat(params: {
  mode: RecipeChatMode;
  ingredients: string[];
  messages: RecipeChatMessage[];
}): Promise<RecipeChatResult> {
  const system = buildSystemPrompt(params.mode, params.ingredients);

  const mistralMessages: MistralMessage[] = [
    { role: "system", content: system },
    ...params.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const temperature =
    params.mode === "from_list" ? 0.75 : params.mode === "seasonal_produce" ? 0.55 : 0.65;

  const raw = await mistralChat({
    messages: mistralMessages,
    temperature,
    jsonMode: true,
  });

  const parsed = chatResponseSchema.parse(extractJsonObject(raw));

  const sources = mergeSources(
    params.mode,
    parsed.sources.map((s) => ({
      label: s.label,
      url: s.url && s.url.length > 0 ? s.url : undefined,
    })),
  );

  const itemsToAdd = filterItemsToAdd(
    parsed.itemsToAdd.map((i) => ({
      title: i.title,
      quantity: i.quantity ?? null,
      unit: i.unit ?? null,
    })),
    params.ingredients,
  );

  return {
    reply: parsed.reply.trim(),
    sources,
    itemsToAdd,
  };
}
