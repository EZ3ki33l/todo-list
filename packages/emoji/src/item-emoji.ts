/** Mots-clés → emoji spécifique (priorité sur l’icône de catégorie). */
const ITEM_EMOJIS: { emoji: string; keywords: string[] }[] = [
  { emoji: "🥔", keywords: ["pomme de terre", "pommes de terre", "patate", "patates"] },
  { emoji: "🍅", keywords: ["tomate", "tomates", "tomate cerise", "tomates cerises"] },
  { emoji: "🥛", keywords: ["lait"] },
  { emoji: "🧈", keywords: ["beurre"] },
  { emoji: "🥚", keywords: ["oeuf", "oeufs", "blanc d oeuf"] },
  { emoji: "🧀", keywords: ["fromage", "emmental", "gruyere", "mozzarella", "parmesan", "camembert", "brie", "roquefort", "feta", "cheddar", "raclette"] },
  { emoji: "🫕", keywords: ["yaourt", "yogurt", "creme fraiche", "creme"] },
  { emoji: "🥩", keywords: ["steak", "entrecote", "rumsteak", "filet mignon", "cote de boeuf", "boeuf", "veau", "roti", "cotelette", "viande", "hache", "hachee", "agneau", "gigot"] },
  { emoji: "🍗", keywords: ["poulet", "dinde", "canard", "escalope"] },
  { emoji: "🥓", keywords: ["bacon", "lardons", "jambon", "saucisson", "charcuterie"] },
  { emoji: "🌭", keywords: ["saucisse", "saucisses", "merguez", "chipolata", "boudin"] },
  { emoji: "🐟", keywords: ["saumon", "thon", "cabillaud", "colin", "truite", "sardine", "sardines", "poisson", "sole", "bar", "dorade", "maquereau", "anchois", "surimi"] },
  { emoji: "🦐", keywords: ["crevette", "crevettes", "crabe", "homard", "calamar", "calamars"] },
  { emoji: "🦪", keywords: ["moule", "moules", "huitre", "huitres"] },
  { emoji: "🥕", keywords: ["carotte", "carottes"] },
  { emoji: "🧅", keywords: ["oignon", "oignons", "echalote", "echalotes"] },
  { emoji: "🧄", keywords: ["ail"] },
  { emoji: "🥒", keywords: ["concombre", "cornichon", "cornichons"] },
  { emoji: "🫑", keywords: ["poivron", "poivrons"] },
  { emoji: "🍆", keywords: ["aubergine", "aubergines"] },
  { emoji: "🥦", keywords: ["brocoli"] },
  { emoji: "🌽", keywords: ["mais"] },
  { emoji: "🍄", keywords: ["champignon", "champignons"] },
  { emoji: "🎃", keywords: ["potiron", "citrouille"] },
  { emoji: "🥬", keywords: ["salade", "laitue", "roquette", "epinard", "epinards", "chou", "blette", "endive", "endives", "fenouil", "persil"] },
  { emoji: "🫘", keywords: ["haricot", "haricots", "lentille", "lentilles", "petit pois"] },
  { emoji: "🍎", keywords: ["pomme", "pommes"] },
  { emoji: "🍐", keywords: ["poire", "poires"] },
  { emoji: "🍌", keywords: ["banane", "bananes"] },
  { emoji: "🍊", keywords: ["orange", "oranges", "clementine", "mandarine", "pamplemousse"] },
  { emoji: "🍋", keywords: ["citron", "citrons", "citron vert"] },
  { emoji: "🍓", keywords: ["fraise", "fraises", "framboise", "framboises", "myrtille", "myrtilles"] },
  { emoji: "🍒", keywords: ["cerise", "cerises"] },
  { emoji: "🍇", keywords: ["raisin", "raisins"] },
  { emoji: "🍉", keywords: ["pasteque", "pasteques", "melon"] },
  { emoji: "🥝", keywords: ["kiwi"] },
  { emoji: "🍍", keywords: ["ananas"] },
  { emoji: "🥭", keywords: ["mangue"] },
  { emoji: "🍑", keywords: ["peche", "peches", "nectarine", "abricot", "abricots", "prune", "prunes"] },
  { emoji: "🥑", keywords: ["avocat", "avocats"] },
  { emoji: "🥖", keywords: ["pain", "baguette", "baguettes", "pain de mie"] },
  { emoji: "🥐", keywords: ["croissant", "croissants", "brioche", "viennoiserie"] },
  { emoji: "🍞", keywords: ["farine", "levure"] },
  { emoji: "🍝", keywords: ["pates", "spaghetti", "tagliatelle", "lasagne"] },
  { emoji: "🍚", keywords: ["riz"] },
  { emoji: "🥣", keywords: ["cereale", "cereales", "semoule", "couscous", "flocons"] },
  { emoji: "🫒", keywords: ["olive", "olives", "huile"] },
  { emoji: "🍯", keywords: ["miel", "confiture"] },
  { emoji: "🍫", keywords: ["chocolat", "cacao", "nutella"] },
  { emoji: "☕", keywords: ["cafe", "the", "tisane", "infusion"] },
  { emoji: "🧂", keywords: ["sel", "poivre", "epice", "epices"] },
  { emoji: "🍶", keywords: ["vinaigre", "sauce soja"] },
  { emoji: "🥫", keywords: ["conserve", "boite", "bocal", "sauce tomate"] },
  { emoji: "🍪", keywords: ["biscuit", "biscuits", "cookie", "cookies"] },
  { emoji: "🍟", keywords: ["frites", "chips"] },
  { emoji: "🧴", keywords: ["savon", "shampoing", "shampooing", "gel douche", "deodorant", "dentifrice"] },
  { emoji: "🧻", keywords: ["papier toilette", "essuie tout"] },
  { emoji: "🧼", keywords: ["lessive", "adoucissant", "eponge", "eponges"] },
  { emoji: "💧", keywords: ["eau"] },
  { emoji: "🥤", keywords: ["jus", "soda", "coca", "cola", "limonade", "sirop", "boisson"] },
  { emoji: "🍺", keywords: ["biere"] },
  { emoji: "🍷", keywords: ["vin", "champagne"] },
];

const SORTED_KEYWORDS = ITEM_EMOJIS.flatMap(({ emoji, keywords }) =>
  keywords.map((keyword) => ({ emoji, keyword })),
).sort((a, b) => b.keyword.length - a.keyword.length);

function normalizeTitle(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, " ")
    .trim();
}

function matchesKeyword(text: string, keyword: string): boolean {
  const kw = normalizeTitle(keyword);
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

/** Emoji Fluent pour un libellé d’article (ex. « Patate » → 🥔). */
export function resolveItemEmojiFromTitle(title: string): string | null {
  const normalized = normalizeTitle(title);
  if (!normalized) return null;

  for (const { emoji, keyword } of SORTED_KEYWORDS) {
    if (matchesKeyword(normalized, keyword)) return emoji;
  }
  return null;
}
