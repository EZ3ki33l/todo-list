/** Normalise une requête cuisine : minuscules, sans accents, œ → oe. */
export function normalizeMealQuery(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "au",
  "aux",
  "a",
  "de",
  "d",
  "du",
  "des",
  "le",
  "la",
  "les",
  "un",
  "une",
  "et",
  "avec",
  "en",
  "ou",
  "sur",
]);

/** Mot ou locution FR (normalisés) → termes TheMealDB (anglais). */
const LEXICON: Record<string, string[]> = {
  "pomme de terre": ["potato"],
  "pommes de terre": ["potato"],
  "patate douce": ["sweet potato"],
  "fruits de mer": ["seafood"],
  "petit dejeuner": ["breakfast"],
  poulet: ["chicken"],
  volaille: ["chicken"],
  pates: ["pasta"],
  pate: ["pasta"],
  spaghetti: ["spaghetti"],
  lasagnes: ["lasagna"],
  lasagne: ["lasagna"],
  boeuf: ["beef"],
  steak: ["steak"],
  porc: ["pork"],
  agneau: ["lamb"],
  veau: ["veal"],
  canard: ["duck"],
  dinde: ["turkey"],
  poisson: ["fish"],
  saumon: ["salmon"],
  thon: ["tuna"],
  crevette: ["shrimp"],
  crevettes: ["shrimp"],
  soupe: ["soup"],
  veloute: ["soup"],
  potage: ["soup"],
  salade: ["salad"],
  tarte: ["tart"],
  gateau: ["cake"],
  dessert: ["dessert"],
  riz: ["rice"],
  curry: ["curry"],
  tajine: ["tagine"],
  gratin: ["gratin"],
  omelette: ["omelette"],
  crepe: ["pancake"],
  crepes: ["pancake"],
  pain: ["bread"],
  fromage: ["cheese"],
  tomate: ["tomato"],
  tomates: ["tomato"],
  oignon: ["onion"],
  oignons: ["onion"],
  ail: ["garlic"],
  champignon: ["mushroom"],
  champignons: ["mushroom"],
  courgette: ["zucchini"],
  courgettes: ["zucchini"],
  aubergine: ["eggplant"],
  aubergines: ["eggplant"],
  chocolat: ["chocolate"],
  citron: ["lemon"],
  orange: ["orange"],
  fraise: ["strawberry"],
  pomme: ["apple"],
  pommes: ["apple"],
  patate: ["potato"],
  patates: ["potato"],
  carotte: ["carrot"],
  carottes: ["carrot"],
  beurre: ["butter"],
  oeuf: ["egg"],
  oeufs: ["egg"],
  lait: ["milk"],
  creme: ["cream"],
  poivre: ["pepper"],
  sel: ["salt"],
  huile: ["oil"],
  vinaigre: ["vinegar"],
  miel: ["honey"],
  sucre: ["sugar"],
};

const CATEGORY_LEXICON: Record<string, string> = {
  poulet: "Chicken",
  volaille: "Chicken",
  boeuf: "Beef",
  porc: "Pork",
  agneau: "Lamb",
  chevre: "Goat",
  dessert: "Dessert",
  desserts: "Dessert",
  "petit dejeuner": "Breakfast",
  vegetarien: "Vegetarian",
  vegetarienne: "Vegetarian",
  vegan: "Vegan",
  vegane: "Vegan",
  "fruits de mer": "Seafood",
  poisson: "Seafood",
  entree: "Starter",
  entrees: "Starter",
  accompagnement: "Side",
  pates: "Pasta",
  pate: "Pasta",
};

const AREA_LEXICON: Record<string, string> = {
  italien: "Italian",
  italienne: "Italian",
  italie: "Italy",
  japonais: "Japanese",
  japonaise: "Japanese",
  japon: "Japan",
  chinois: "Chinese",
  chinoise: "Chinese",
  chine: "China",
  mexicain: "Mexican",
  mexicaine: "Mexican",
  mexique: "Mexico",
  indien: "Indian",
  indienne: "Indian",
  inde: "India",
  grec: "Greek",
  grecque: "Greek",
  grece: "Greece",
  marocain: "Moroccan",
  marocaine: "Moroccan",
  maroc: "Morocco",
  thai: "Thai",
  thailande: "Thailand",
  espagnol: "Spanish",
  espagnole: "Spanish",
  espagne: "Spain",
  britannique: "British",
  anglais: "British",
  americain: "American",
  americaine: "American",
  turc: "Turkish",
  turque: "Turkish",
  vietnamien: "Vietnamese",
  vietnamienne: "Vietnamese",
};

function translateNormalized(norm: string): string {
  const tokens = norm.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    let matched = false;
    for (let len = Math.min(4, tokens.length - i); len >= 1; len -= 1) {
      const phrase = tokens.slice(i, i + len).join(" ");
      const english = LEXICON[phrase];
      if (english?.[0]) {
        out.push(english[0]);
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out.push(tokens[i]!);
      i += 1;
    }
  }
  return out.join(" ");
}

function dropStopwords(text: string): string {
  return text
    .split(/\s+/)
    .filter((word) => word && !STOPWORDS.has(word))
    .join(" ");
}

/**
 * Variantes à envoyer à search.php : requête d'origine + équivalents anglais.
 * « poulet au curry » → poulet au curry, chicken au curry, chicken curry.
 */
export function expandMealSearchQueries(query: string): string[] {
  const original = query.trim();
  if (!original) return [];

  const norm = normalizeMealQuery(original);
  const translated = translateNormalized(norm);
  const withoutStop = dropStopwords(translated);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const candidate of [original, translated, withoutStop]) {
    const key = normalizeMealQuery(candidate);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(candidate.trim());
  }
  return out;
}

export function frenchQueryCategory(query: string): string | null {
  return CATEGORY_LEXICON[normalizeMealQuery(query)] ?? null;
}

export function frenchQueryArea(query: string): string | null {
  return AREA_LEXICON[normalizeMealQuery(query)] ?? null;
}

export function frenchQueryIngredient(query: string): string | null {
  const english = LEXICON[normalizeMealQuery(query)];
  return english?.[0] ?? null;
}

/** « Poulet » → chicken, pour filtrer TheMealDB par ingrédient. */
export function englishTermsForIngredient(title: string): string[] {
  const original = normalizeMealQuery(title);
  if (!original) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  const push = (term: string) => {
    const key = normalizeMealQuery(term);
    if (!key || key === original || seen.has(key)) return;
    seen.add(key);
    out.push(term);
  };

  for (const term of LEXICON[original] ?? []) push(term);
  for (const variant of expandMealSearchQueries(title)) push(variant);
  if (out.length === 0 && original) out.push(title.trim());
  return out;
}

/** Unité de mesure EN (singulier normalisé) → FR {singulier, pluriel}. */
const UNIT_LEXICON: Record<string, { singular: string; plural: string }> = {
  tablespoon: { singular: "cuillère à soupe", plural: "cuillères à soupe" },
  tbsp: { singular: "cuillère à soupe", plural: "cuillères à soupe" },
  tbs: { singular: "cuillère à soupe", plural: "cuillères à soupe" },
  teaspoon: { singular: "cuillère à café", plural: "cuillères à café" },
  tsp: { singular: "cuillère à café", plural: "cuillères à café" },
  cup: { singular: "tasse", plural: "tasses" },
  pinch: { singular: "pincée", plural: "pincées" },
  clove: { singular: "gousse", plural: "gousses" },
  slice: { singular: "tranche", plural: "tranches" },
  can: { singular: "boîte", plural: "boîtes" },
  jar: { singular: "pot", plural: "pots" },
  stick: { singular: "bâtonnet", plural: "bâtonnets" },
  bunch: { singular: "botte", plural: "bottes" },
  sprig: { singular: "brin", plural: "brins" },
  large: { singular: "gros", plural: "gros" },
  medium: { singular: "moyen", plural: "moyens" },
  small: { singular: "petit", plural: "petits" },
  package: { singular: "paquet", plural: "paquets" },
  packet: { singular: "sachet", plural: "sachets" },
  drop: { singular: "goutte", plural: "gouttes" },
  head: { singular: "tête", plural: "têtes" },
  stalk: { singular: "branche", plural: "branches" },
  handful: { singular: "poignée", plural: "poignées" },
};

/** « 5 tablespoons » → « cuillères à soupe » ; renvoie l'unité telle quelle si inconnue (g, kg, ml, L…). */
export function translateMeasureUnit(unit: string | null, quantity: number | null): string | null {
  if (!unit) return unit;
  const raw = unit.toLowerCase().trim();
  // Exact match d'abord (« tbs » ne doit pas perdre son s au profit de « tb »).
  const entry = UNIT_LEXICON[raw] ?? UNIT_LEXICON[raw.replace(/s$/, "")];
  if (!entry) return unit;
  return quantity !== null && Math.abs(quantity) > 1 ? entry.plural : entry.singular;
}

/** Évite les faux positifs TheMealDB (« riz » dans « chorizo »). */
export function titleMatchesWholeQuery(title: string, query: string): boolean {
  const needle = normalizeMealQuery(query);
  if (!needle) return false;
  const words = normalizeMealQuery(title).split(/\s+/).filter(Boolean);
  const parts = needle.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return words.includes(parts[0]!);
  return normalizeMealQuery(title).includes(needle);
}
