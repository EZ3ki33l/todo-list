/**
 * Analyse des réponses du Chef IA (markdown léger) en blocs affichables.
 * Le rendu reste propre à chaque plateforme, seule la structure est partagée.
 */

export type SectionKind = "ingredients" | "steps" | "info";

export type ParsedSection = {
  kind: SectionKind;
  label: string;
  items: string[];
};

export type ParsedRecipe = {
  title: string;
  time?: string;
  intro?: string;
  sections: ParsedSection[];
};

export type ParsedSeason = {
  name: string;
  lines: string[];
};

export type ParsedChefMessage = {
  /** Texte libre précédant la première recette / saison. */
  intro: string[];
  recipes: ParsedRecipe[];
  seasons: ParsedSeason[];
};

export function stripMd(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

export function isRecipeTitle(line: string): boolean {
  const t = line.trim();
  return /^\*\*(\d+\.\s*)?.+\*\*$/.test(t) && !/^(Printemps|Été|Automne|Hiver)/i.test(stripMd(t));
}

export function isSeasonTitle(line: string): boolean {
  return /^(Printemps|Été|Automne|Hiver)$/i.test(stripMd(line.trim()));
}

export function sectionKind(line: string): SectionKind | null {
  const t = stripMd(line).toLowerCase();
  if (t.includes("ingrédient") || line.includes("📝")) return "ingredients";
  if (t.includes("étape") || t.includes("preparation") || line.includes("👨‍🍳")) return "steps";
  return null;
}

export function isListLine(line: string): boolean {
  return /^[-•*]\s+/.test(line.trim()) || /^\d+\.\s+/.test(line.trim());
}

export function listItemText(line: string): string {
  return stripMd(line.trim().replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, ""));
}

/**
 * Durée d'une recette (« ⏱️ Temps : 40 min »).
 *
 * Le motif est ancré en début de ligne : sinon une étape comme
 * « 2. Enfourner 30 minutes » passerait pour une durée, ce qui interrompait
 * la liste des étapes et écrasait le temps de la recette.
 */
export function parseTime(line: string): string | undefined {
  const trimmed = line.trim();
  if (isListLine(trimmed)) return undefined;
  if (!/^(⏱|temps\b|\d+\s*(min|h|heures?)\b)/i.test(stripMd(trimmed))) return undefined;
  return stripMd(trimmed.replace(/^⏱️?\s*/, ""));
}

/** Découpe les segments gras / italiques d'une ligne, dans l'ordre. */
export type InlineSpan = { text: string; emphasis: "none" | "strong" | "em" };

export function parseInlineSpans(text: string): InlineSpan[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return { text: part.slice(2, -2), emphasis: "strong" as const };
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return { text: part.slice(1, -1), emphasis: "em" as const };
    }
    return { text: part, emphasis: "none" as const };
  });
}

function parseSectionItems(lines: string[], start: number, kind: SectionKind) {
  const items: string[] = [];
  let i = start;
  while (i < lines.length) {
    const next = (lines[i] ?? "").trim();
    if (!next) {
      i++;
      continue;
    }
    if (sectionKind(next) || isRecipeTitle(next) || isSeasonTitle(next) || parseTime(next)) break;
    if (!isListLine(next) && kind !== "steps") break;
    items.push(listItemText(next));
    i++;
  }
  return { items, next: i };
}

function parseRecipe(lines: string[], start: number) {
  const recipe: ParsedRecipe = {
    title: stripMd(lines[start] ?? "").replace(/^\d+\.\s*/, ""),
    sections: [],
  };
  let i = start + 1;

  while (i < lines.length && !isRecipeTitle(lines[i] ?? "") && !isSeasonTitle(lines[i] ?? "")) {
    const trimmed = (lines[i] ?? "").trim();
    if (!trimmed) {
      i++;
      continue;
    }

    const time = parseTime(trimmed);
    if (time) {
      recipe.time = time;
      i++;
      continue;
    }

    const kind = sectionKind(trimmed);
    if (kind) {
      const parsed = parseSectionItems(lines, i + 1, kind);
      recipe.sections.push({
        kind,
        label: stripMd(trimmed.replace(/^📝\s*|^👨‍🍳\s*/, "")),
        items: parsed.items,
      });
      i = parsed.next;
      continue;
    }

    const last = recipe.sections[recipe.sections.length - 1];
    if (isListLine(trimmed)) {
      if (last) last.items.push(listItemText(trimmed));
      else if (!recipe.intro) recipe.intro = listItemText(trimmed);
    } else if (!recipe.intro && recipe.sections.length === 0) {
      recipe.intro = stripMd(trimmed);
    } else if (last) {
      last.items.push(stripMd(trimmed));
    }
    i++;
  }

  return { recipe, next: i };
}

function parseSeason(lines: string[], start: number) {
  const season: ParsedSeason = { name: stripMd(lines[start] ?? ""), lines: [] };
  let i = start + 1;
  while (i < lines.length && !isSeasonTitle(lines[i] ?? "") && !isRecipeTitle(lines[i] ?? "")) {
    const l = (lines[i] ?? "").trim();
    if (l) season.lines.push(stripMd(l));
    i++;
  }
  return { season, next: i };
}

export function parseChefMessage(text: string): ParsedChefMessage {
  const lines = text.split("\n");
  const intro: string[] = [];
  const recipes: ParsedRecipe[] = [];
  const seasons: ParsedSeason[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (isSeasonTitle(line)) {
      const parsed = parseSeason(lines, i);
      seasons.push(parsed.season);
      i = parsed.next;
      continue;
    }

    if (isRecipeTitle(line)) {
      const parsed = parseRecipe(lines, i);
      recipes.push(parsed.recipe);
      i = parsed.next;
      continue;
    }

    // Une recette / saison consomme tout jusqu'au titre suivant : seul le
    // texte qui précède le premier bloc peut arriver ici.
    const trimmed = line.trim();
    if (trimmed) intro.push(stripMd(trimmed));
    i++;
  }

  return { intro, recipes, seasons };
}
