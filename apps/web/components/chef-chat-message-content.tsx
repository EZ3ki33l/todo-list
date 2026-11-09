"use client";

import type { ReactNode } from "react";

import { FluentEmoji } from "@/components/fluent-emoji";
import {
  isListLine,
  listItemText,
  parseChefMessage,
  parseInlineSpans,
  type ParsedRecipe,
  type ParsedSeason,
  type ParsedSection,
} from "@repo/domain/chef-message";

/** Bouton « Enregistrer » d'une carte recette, piloté par le chat parent. */
export type SaveRecipeState = {
  onSave: () => void;
  saving: boolean;
  saved: boolean;
};

function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInlineSpans(text).map((span, idx) => {
        if (span.emphasis === "strong") {
          return (
            <strong key={idx} className="font-semibold text-app-text">
              {span.text}
            </strong>
          );
        }
        if (span.emphasis === "em") {
          return (
            <em key={idx} className="text-app-text-muted">
              {span.text}
            </em>
          );
        }
        return <span key={idx}>{span.text}</span>;
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

function RecipeCard({
  recipe,
  save,
}: {
  recipe: ParsedRecipe;
  save?: SaveRecipeState;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-orange-100 bg-app-bg-elevated shadow-sm">
      <header className="border-b border-orange-50 bg-linear-to-r from-orange-50 to-amber-50 px-3.5 py-2.5">
        <div className="flex items-start gap-2">
          <h4 className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-app-text">
            {recipe.title}
          </h4>
          {save ? (
            <button
              type="button"
              onClick={save.onSave}
              disabled={save.saved || save.saving}
              className="shrink-0 rounded-full border border-orange-200 bg-app-bg-elevated px-2.5 py-1 text-xs font-medium text-app-badge-text transition hover:bg-orange-50 disabled:opacity-60"
            >
              {save.saved ? "✓ Enregistrée" : save.saving ? "…" : "Enregistrer"}
            </button>
          ) : null}
        </div>
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
  saveState,
}: {
  text: string;
  /** Mode saison : n'affiche pas de cartes recette */
  productsOnly?: boolean;
  /** Fourni par le chat pour offrir « Enregistrer » sur chaque recette. */
  saveState?: (recipeIndex: number) => SaveRecipeState;
}) {
  const parsed = parseChefMessage(text);
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
    blocks.push(
      <RecipeCard key={`recipe-${idx}`} recipe={recipe} save={saveState?.(idx)} />,
    );
  });

  parsed.seasons.forEach((season, idx) => {
    blocks.push(<SeasonCard key={`season-${idx}`} season={season} />);
  });

  return <div className="space-y-3">{blocks}</div>;
}
