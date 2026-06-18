"use client";

import type { ReactNode } from "react";

import { FluentEmoji } from "@/components/fluent-emoji";

type SectionKind = "ingredients" | "steps" | "info";

type ParsedSection = {
  kind: SectionKind;
  label: string;
  items: string[];
};

type ParsedRecipe = {
  title: string;
  time?: string;
  intro?: string;
  sections: ParsedSection[];
};

type ParsedSeason = {
  name: string;
  lines: string[];
};

function stripMd(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function isRecipeTitle(line: string): boolean {
  const t = line.trim();
  return /^\*\*(\d+\.\s*)?.+\*\*$/.test(t) && !/^(Printemps|Été|Automne|Hiver)/i.test(stripMd(t));
}

function isSeasonTitle(line: string): boolean {
  const inner = stripMd(line.trim());
  return /^(Printemps|Été|Automne|Hiver)$/i.test(inner);
}

function sectionKind(line: string): SectionKind | null {
  const t = stripMd(line).toLowerCase();
  if (t.includes("ingrédient") || line.includes("📝")) return "ingredients";
  if (t.includes("étape") || t.includes("preparation") || line.includes("👨‍🍳")) return "steps";
  return null;
}

function isListLine(line: string): boolean {
  return /^[-•*]\s+/.test(line.trim()) || /^\d+\.\s+/.test(line.trim());
}

function listItemText(line: string): string {
  return stripMd(line.trim().replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, ""));
}

function parseTime(line: string): string | undefined {
  if (!/⏱|temps|min/i.test(line)) return undefined;
  return stripMd(line.replace(/^⏱️?\s*/, ""));
}

function parseContent(text: string): {
  intro: string[];
  recipes: ParsedRecipe[];
  seasons: ParsedSeason[];
  tail: string[];
} {
  const lines = text.split("\n");
  const intro: string[] = [];
  const recipes: ParsedRecipe[] = [];
  const seasons: ParsedSeason[] = [];
  const tail: string[] = [];

  let i = 0;
  while (i < lines.length && lines[i]?.trim() === "") i++;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (isSeasonTitle(line)) {
      const season: ParsedSeason = { name: stripMd(line), lines: [] };
      i++;
      while (i < lines.length && !isSeasonTitle(lines[i] ?? "") && !isRecipeTitle(lines[i] ?? "")) {
        const l = (lines[i] ?? "").trim();
        if (l) season.lines.push(stripMd(l));
        i++;
      }
      seasons.push(season);
      continue;
    }

    if (isRecipeTitle(line)) {
      const recipe: ParsedRecipe = {
        title: stripMd(line).replace(/^\d+\.\s*/, ""),
        sections: [],
      };
      i++;

      while (i < lines.length && !isRecipeTitle(lines[i] ?? "") && !isSeasonTitle(lines[i] ?? "")) {
        const l = lines[i] ?? "";
        const trimmed = l.trim();

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
          const section: ParsedSection = {
            kind,
            label: stripMd(trimmed.replace(/^📝\s*|^👨‍🍳\s*/, "")),
            items: [],
          };
          i++;
          while (i < lines.length) {
            const next = (lines[i] ?? "").trim();
            if (!next) {
              i++;
              continue;
            }
            if (sectionKind(next) || isRecipeTitle(next) || isSeasonTitle(next) || parseTime(next)) {
              break;
            }
            if (isListLine(next) || kind === "steps") {
              section.items.push(listItemText(next));
              i++;
              continue;
            }
            break;
          }
          recipe.sections.push(section);
          continue;
        }

        if (isListLine(trimmed)) {
          const last = recipe.sections[recipe.sections.length - 1];
          if (last) {
            last.items.push(listItemText(trimmed));
          } else if (!recipe.intro) {
            recipe.intro = listItemText(trimmed);
          }
          i++;
          continue;
        }

        if (!recipe.intro && recipe.sections.length === 0) {
          recipe.intro = stripMd(trimmed);
        } else {
          const last = recipe.sections[recipe.sections.length - 1];
          if (last) last.items.push(stripMd(trimmed));
        }
        i++;
      }

      recipes.push(recipe);
      continue;
    }

    if (recipes.length === 0 && seasons.length === 0) {
      if (trimmed) intro.push(stripMd(trimmed));
    } else {
      if (trimmed) tail.push(stripMd(trimmed));
    }
    i++;
  }

  return { intro, recipes, seasons, tail };
}

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={idx} className="font-semibold text-app-text">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <em key={idx} className="text-app-text-muted">
              {part.slice(1, -1)}
            </em>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}

function SectionBlock({ section }: { section: ParsedSection }) {
  const icon = section.kind === "ingredients" ? "🥗" : section.kind === "steps" ? "👨‍🍳" : "ℹ️";
  return (
    <div className="mt-2">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-app-badge-text/80">
        <FluentEmoji emoji={icon} size={14} />
        <span>
          {section.label || (section.kind === "ingredients" ? "Ingrédients" : "Étapes")}
        </span>
      </p>
      <ul className="space-y-1">
        {section.items.map((item, idx) => (
          <li
            key={idx}
            className={`text-sm text-app-text ${section.kind === "steps" ? "flex gap-2" : "flex gap-2 before:mt-2 before:text-orange-400 before:content-['•']"}`}
          >
            {section.kind === "steps" ? (
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-app-badge-bg text-xs font-bold text-app-badge-text">
                {idx + 1}
              </span>
            ) : null}
            <span className="min-w-0 flex-1 leading-snug">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: ParsedRecipe }) {
  return (
    <article className="overflow-hidden rounded-xl border border-orange-100 bg-app-bg-elevated shadow-sm">
      <header className="border-b border-orange-50 bg-linear-to-r from-orange-50 to-amber-50 px-3.5 py-2.5">
        <h4 className="text-[15px] font-bold leading-snug text-app-text">{recipe.title}</h4>
        {recipe.time ? (
          <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-app-bg-elevated/80 px-2 py-0.5 text-xs font-medium text-app-badge-text">
            ⏱ {recipe.time}
          </p>
        ) : null}
      </header>
      <div className="px-3.5 py-2.5">
        {recipe.intro ? (
          <p className="mb-1 text-sm italic leading-snug text-app-text-subtle">{recipe.intro}</p>
        ) : null}
        {recipe.sections.map((section, idx) => (
          <SectionBlock key={idx} section={section} />
        ))}
      </div>
    </article>
  );
}

function SeasonCard({ season }: { season: ParsedSeason }) {
  return (
    <article className="rounded-xl border border-green-100 bg-app-bg-elevated px-3.5 py-2.5 shadow-sm">
      <h4 className="text-sm font-bold text-green-900">{season.name}</h4>
      <ul className="mt-2 space-y-1">
        {season.lines.map((line, idx) => (
          <li key={idx} className="text-sm leading-snug text-app-text">
            <InlineText text={line} />
          </li>
        ))}
      </ul>
    </article>
  );
}

export function ChefChatMessageContent({
  text,
  productsOnly = false,
}: {
  text: string;
  /** Mode saison : n'affiche pas de cartes recette */
  productsOnly?: boolean;
}) {
  const parsed = parseContent(text);
  const recipes = productsOnly ? [] : parsed.recipes;

  if (recipes.length === 0 && parsed.seasons.length === 0) {
    return (
      <div className="space-y-2 text-sm leading-relaxed text-app-text">
        {text.split("\n").map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1" />;
          if (isListLine(trimmed)) {
            return (
              <p key={idx} className="flex gap-2 pl-1">
                <span className="text-orange-400">•</span>
                <span>{listItemText(trimmed)}</span>
              </p>
            );
          }
          return (
            <p key={idx}>
              <InlineText text={trimmed} />
            </p>
          );
        })}
      </div>
    );
  }

  const blocks: ReactNode[] = [];

  if (parsed.intro.length > 0) {
    blocks.push(
      <p key="intro" className="text-sm leading-relaxed text-app-text-muted">
        {parsed.intro.join(" ")}
      </p>,
    );
  }

  recipes.forEach((recipe, idx) => {
    blocks.push(<RecipeCard key={`recipe-${idx}`} recipe={recipe} />);
  });

  parsed.seasons.forEach((season, idx) => {
    blocks.push(<SeasonCard key={`season-${idx}`} season={season} />);
  });

  if (parsed.tail.length > 0) {
    blocks.push(
      <p key="tail" className="text-sm text-app-text-muted">
        {parsed.tail.join(" ")}
      </p>,
    );
  }

  return <div className="space-y-3">{blocks}</div>;
}
