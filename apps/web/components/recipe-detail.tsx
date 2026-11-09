"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FluentEmoji } from "@/components/fluent-emoji";
import { RecipeForm, type RecipeFormValue } from "@/components/recipe-form";
import { RecipeSourceBadge } from "@/components/recipe-source-badge";
import { itemIcon } from "@repo/domain/grocery-ui";
import type { GroceryCategory } from "@repo/domain/grocery-detect";
import { confirmPermanentDelete } from "@/lib/confirm-delete";
import { trpc } from "@/lib/trpc";

export function RecipeDetail({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);

  const { data: recipe, isLoading, error } = trpc.recipes.getById.useQuery({ recipeId });

  const updateRecipe = trpc.recipes.update.useMutation({
    onSuccess: () => {
      setEditing(false);
      void utils.recipes.getById.invalidate({ recipeId });
      void utils.recipes.list.invalidate();
    },
  });

  const deleteRecipe = trpc.recipes.delete.useMutation({
    onSuccess: () => {
      void utils.recipes.list.invalidate();
      router.push("/dashboard/recettes");
    },
  });

  if (isLoading) return <p className="text-sm text-app-text-subtle">Chargement…</p>;

  if (error || !recipe) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-app-danger">
          {error?.message ?? "Recette introuvable."}
        </p>
        <Link href="/dashboard/recettes" className="text-sm text-app-badge-text underline">
          Retour au carnet
        </Link>
      </div>
    );
  }

  if (editing) {
    const initial: RecipeFormValue = {
      title: recipe.title,
      timeLabel: recipe.timeLabel,
      servings: recipe.servings,
      notes: recipe.notes,
      ingredients: recipe.ingredients.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        unit: i.unit,
        category: i.category as GroceryCategory,
      })),
      steps: recipe.steps.map((s) => s.text),
    };

    return (
      <RecipeForm
        initial={initial}
        submitLabel="Enregistrer les modifications"
        pending={updateRecipe.isPending}
        error={updateRecipe.error?.message ?? null}
        onSubmit={(value) => updateRecipe.mutate({ ...value, recipeId })}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <article className="space-y-6">
      {recipe.imageUrl ? (
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-app-bg-soft sm:aspect-[2/1]">
          <img src={recipe.imageUrl} alt="" className="size-full object-cover" />
        </div>
      ) : null}

      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-app-text">{recipe.title}</h1>
          <RecipeSourceBadge source={recipe.source} />
        </div>
        <p className="text-sm text-app-text-subtle">
          {[recipe.timeLabel, recipe.servings ? `${recipe.servings} parts` : null]
            .filter(Boolean)
            .join(" · ") || "Pas de durée renseignée"}
        </p>
        {recipe.notes ? (
          <p className="pt-1 text-sm italic leading-snug text-app-text-muted">{recipe.notes}</p>
        ) : null}
      </header>

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-app-text">
          <FluentEmoji emoji="🥗" size={16} />
          Ingrédients
        </h2>
        {recipe.ingredients.length === 0 ? (
          <p className="text-sm text-app-text-subtle">Aucun ingrédient.</p>
        ) : (
          <ul className="space-y-1">
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient.id} className="flex items-center gap-2 text-sm text-app-text">
                <FluentEmoji
                  emoji={itemIcon(ingredient.category as GroceryCategory, null, ingredient.title)}
                  size={18}
                />
                <span className="min-w-0 flex-1">{ingredient.title}</span>
                {ingredient.quantity !== null ? (
                  <span className="text-app-text-muted">
                    {ingredient.quantity}
                    {ingredient.unit ? ` ${ingredient.unit}` : ""}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-app-text">
          <FluentEmoji emoji="👨‍🍳" size={16} />
          Étapes
        </h2>
        {recipe.steps.length === 0 ? (
          <p className="text-sm text-app-text-subtle">Aucune étape.</p>
        ) : (
          <ol className="space-y-2">
            {recipe.steps.map((step, idx) => (
              <li key={step.id} className="flex gap-2 text-sm leading-snug text-app-text">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-app-badge-bg text-xs font-bold text-app-badge-text">
                  {idx + 1}
                </span>
                <span className="min-w-0 flex-1">{step.text}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md border border-app-border px-4 py-2 text-sm text-app-text hover:bg-app-bg-soft"
        >
          Modifier
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirmPermanentDelete(recipe.title)) deleteRecipe.mutate({ recipeId });
          }}
          disabled={deleteRecipe.isPending}
          className="rounded-md border border-app-border-soft px-4 py-2 text-sm text-app-danger hover:bg-app-danger-bg disabled:opacity-40"
        >
          Supprimer
        </button>
        <Link
          href="/dashboard/recettes"
          className="rounded-md px-4 py-2 text-sm text-app-text-muted hover:bg-app-bg-soft"
        >
          Retour au carnet
        </Link>
      </div>
    </article>
  );
}
