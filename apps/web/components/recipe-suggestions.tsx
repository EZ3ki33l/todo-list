"use client";

import { useState } from "react";

import { trpc } from "@/lib/trpc";

type Props = {
  listId: string;
  enabled: boolean;
  ingredientCount: number;
  minIngredients?: number;
};

export function RecipeSuggestions({
  listId,
  enabled,
  ingredientCount,
  minIngredients = 2,
}: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const suggest = trpc.recipes.suggestFromList.useMutation();

  if (!enabled) return null;

  const canSuggest = ingredientCount >= minIngredients;
  const recipes = suggest.data?.recipes ?? [];

  function handleSuggest() {
    if (!canSuggest) return;
    setExpandedIndex(null);
    suggest.mutate({ listId, limit: 5, refresh: recipes.length > 0 });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="recipe-ideas-heading" className="text-base font-bold text-app-text">
          🍳 Idées repas
        </h2>
        <button
          type="button"
          onClick={handleSuggest}
          disabled={suggest.isPending || !canSuggest}
          className="rounded-md bg-app-primary px-3 py-1.5 text-sm font-medium text-app-on-primary hover:opacity-90 disabled:opacity-50"
        >
          {suggest.isPending
            ? "Génération…"
            : recipes.length > 0
              ? "Actualiser"
              : "Proposer"}
        </button>
      </div>

      <p className="text-sm text-app-text-muted">
        Idées variées à partir de vos articles — l&apos;IA peut compléter avec des ingrédients
        courants (sel, huile, épices…).
      </p>

      {!canSuggest ? (
        <p className="text-sm text-app-text">
          Ajoutez au moins {minIngredients} articles non cochés pour obtenir des idées.
        </p>
      ) : null}

      {suggest.error ? (
        <p className="text-sm text-app-danger">{suggest.error.message}</p>
      ) : null}

      <ul className="space-y-2">
        {recipes.map((recipe, index) => {
          const open = expandedIndex === index;
          return (
            <li key={`${recipe.title}-${index}`}>
              <button
                type="button"
                onClick={() => setExpandedIndex(open ? null : index)}
                className="w-full rounded-lg border border-app-border-soft bg-app-bg-elevated p-3 text-left hover:bg-app-bg-soft"
              >
                <p className="font-semibold text-app-text">{recipe.title}</p>
                {recipe.prepTimeMinutes != null ? (
                  <p className="mt-1 text-xs text-app-text-subtle">
                    ~{recipe.prepTimeMinutes} min
                  </p>
                ) : null}
                {recipe.usedIngredients.length > 0 ? (
                  <p className={`mt-1 text-xs text-app-text-subtle ${open ? "" : "line-clamp-2"}`}>
                    Utilise : {recipe.usedIngredients.join(", ")}
                  </p>
                ) : null}
                {open && recipe.missingIngredients.length > 0 ? (
                  <p className="mt-2 text-xs text-app-badge-text">
                    En plus : {recipe.missingIngredients.join(", ")}
                  </p>
                ) : null}
                {open ? (
                  <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-app-text">
                    {recipe.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 text-xs italic text-app-text-subtle">
                    Cliquer pour voir les étapes
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {suggest.data?.cached ? (
        <p className="text-right text-xs text-app-text-subtle">
          Résultat en cache (liste inchangée).
        </p>
      ) : null}
    </div>
  );
}
