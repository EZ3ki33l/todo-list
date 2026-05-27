export type GroceryCategory =
  | "LEGUME"
  | "FRUIT"
  | "VIANDE"
  | "POISSON"
  | "BOULANGERIE"
  | "EPICERIE"
  | "LAITIER"
  | "BOISSON"
  | "HYGIENE"
  | "AUTRE";

const KEYWORDS: Record<Exclude<GroceryCategory, "AUTRE">, string[]> = {
  LEGUME: [
    "tomate", "tomates", "carotte", "carottes", "oignon", "oignons", "ail", "persil",
    "salade", "laitue", "roquette", "epinard", "epinards", "chou", "brocoli", "courgette",
    "courgettes", "aubergine", "poivron", "poivrons", "haricot", "haricots", "petit pois",
    "pomme de terre", "patate", "patates", "radis", "celeri", "fenouil", "betterave",
    "navet", "potiron", "citrouille", "champignon", "champignons", "asperge", "asperges",
    "artichaut", "concombre", "mais", "blette", "poireau", "poireaux", "endive", "endives",
  ],
  FRUIT: [
    "pomme", "pommes", "poire", "poires", "banane", "bananes", "orange", "oranges",
    "citron", "citrons", "fraise", "fraises", "framboise", "framboises", "myrtille",
    "cerise", "cerises", "raisin", "raisins", "melon", "pasteque", "pasteques", "kiwi",
    "ananas", "mangue", "abricot", "abricots", "peche", "peches", "prune", "prunes",
    "nectarine", "avocat", "avocats", "figue", "figues", "grenade", "clementine",
    "mandarine", "pamplemousse", "fruit",
  ],
  VIANDE: [
    "poulet", "dinde", "canard", "boeuf", "veau", "porc", "jambon", "lardons", "bacon",
    "saucisse", "saucisses", "merguez", "chipolata", "steak", "entrecote", "rumsteak",
    "escalope", "cotelette", "roti", "filet mignon", "boudin", "charcuterie", "viande",
    "hache", "hachee", "cote de boeuf", "agneau", "gigot", "saucisson",
  ],
  POISSON: [
    "saumon", "thon", "cabillaud", "colin", "truite", "sardine", "sardines", "crevette",
    "crevettes", "moule", "moules", "huitre", "huitres", "poisson", "sole", "bar",
    "dorade", "maquereau", "anchois", "surimi", "crabe", "homard", "calamar", "calamars",
  ],
  BOULANGERIE: [
    "pain", "baguette", "baguettes", "brioche", "croissant", "croissants", "pain de mie",
    "viennoiserie", "farine", "levure", "pate", "pizza", "tortilla", "gaufre", "gaufres",
  ],
  EPICERIE: [
    "riz", "pates", "semoule", "couscous", "lentille", "lentilles", "haricot sec",
    "huile", "vinaigre", "sel", "poivre", "epice", "epices", "moutarde", "ketchup",
    "mayonnaise", "sauce tomate", "conserve", "boite", "bocal", "confiture", "miel",
    "sucre", "chocolat", "cacao", "cafe", "the", "biscuit", "biscuits", "chips",
    "cereale", "cereales", "soupe", "bouillon", "olive", "olives", "cornichon",
    "cornichons", "capre", "capres", "nutella", "cereale",
  ],
  LAITIER: [
    "lait", "beurre", "creme", "yaourt", "yogurt", "fromage", "emmental", "gruyere",
    "mozzarella", "parmesan", "camembert", "brie", "roquefort", "feta", "cheddar",
    "raclette", "creme fraiche", "oeuf", "oeufs", "blanc d oeuf",
  ],
  BOISSON: [
    "eau", "jus", "soda", "coca", "cola", "biere", "vin", "champagne", "limonade",
    "sirop", "whisky", "rhum", "vodka", "tisane", "infusion", "boisson",
  ],
  HYGIENE: [
    "savon", "shampoing", "shampooing", "dentifrice", "brosse a dents", "papier toilette",
    "essuie tout", "serviette hygienique", "tampon", "tampons", "gel douche", "deodorant",
    "lessive", "adoucissant", "eponge", "eponges", "rasoir", "rasoirs", "coton",
  ],
};

/** Clé de regroupement pour articles récurrents et mémoire catégorie. */
export function normalizeItemTitle(text: string): string {
  return normalize(text);
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, " ")
    .trim();
}

function matchesKeyword(text: string, keyword: string): boolean {
  const kw = normalize(keyword);
  if (!kw) return false;
  if (text === kw) return true;
  if (kw.includes(" ")) return text.includes(kw);

  const words = text.split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (word === kw) return true;
    if (kw.length >= 5 && word.startsWith(kw)) return true;
  }
  return false;
}

export type ItemMemory = {
  titleNorm: string;
  category: GroceryCategory;
};

/** Dictionnaire fixe, puis mémoire personnelle (articles déjà ajoutés). */
export function detectCategory(
  title: string,
  memory: ItemMemory[] = [],
): GroceryCategory | null {
  const n = normalize(title);
  if (!n) return null;

  for (const category of Object.keys(KEYWORDS) as Exclude<GroceryCategory, "AUTRE">[]) {
    for (const keyword of KEYWORDS[category]) {
      if (matchesKeyword(n, keyword)) return category;
    }
  }

  const fromMemory = memory.find((m) => m.titleNorm === n);
  if (fromMemory) return fromMemory.category;

  return null;
}
