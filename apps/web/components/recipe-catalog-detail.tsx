"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { FluentEmoji } from "@/components/fluent-emoji";
import { itemIcon } from "@repo/domain/grocery-ui";
import type { GroceryCategory } from "@repo/domain/grocery-detect";
import { trpc } from "@/lib/trpc";

export function RecipeCatalogDetail({ mealId }: { mealId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.recipes.catalogGet.useQuery({ mealId });

  const importMeal = trpc.recipes.importFromCatalog.useMutation({
    onSuccess: (result) => {
      void utils.recipes.list.invalidate();
      void utils.recipes.catalogGet.invalidate({ mealId });
      router.push(`/dashboard/recettes/${result.recipe.id}`);
    },
  });

  if (isLoading) return <p className="text-sm text-app-text-subtle">Chargement…</p>;

  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-app-danger">
          {error?.message ?? "Recette introuvable dans le catalogue."}
        </p>
        <Link href="/dashboard/recettes" className="text-sm text-app-badge-text underline">
          Retour au carnet
        </Link>
      </div>
    );
  }

  const { meal, savedRecipeId } = data;

  return (
    <article className="space-y-6">
      <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-app-bg-soft sm:aspect-[2/1]">
        <Image
          src={meal.thumbUrl}
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 768px"
          className="object-cover"
        />
      </div>

      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-app-text">{meal.title}</h1>
        <p className="text-sm text-app-text-subtle">
          {[meal.areaLabel ? `Cuisine ${meal.areaLabel.toLowerCase()}` : null, meal.categoryLabel]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {meal.tags.length > 0 ? (
          <p className="text-xs text-app-text-muted">{meal.tags.join(" · ")}</p>
        ) : null}
      </header>

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-app-text">
          <FluentEmoji emoji="🥗" size={16} />
          Ingrédients
        </h2>
        {meal.ingredients.length === 0 ? (
          <p className="text-sm text-app-text-subtle">Aucun ingrédient.</p>
        ) : (
          <ul className="space-y-1">
            {meal.ingredients.map((ingredient, idx) => (
              <li key={`${ingredient.title}-${idx}`} className="flex items-center gap-2 text-sm text-app-text">
                <FluentEmoji
                  emoji={itemIcon(ingredient.category as GroceryCategory, null, ingredient.title)}
                  size={18}
                />
                <span className="min-w-0 flex-1">{ingredient.title}</span>
                {ingredient.quantity !== null || ingredient.unit ? (
                  <span className="text-app-text-muted">
                    {ingredient.quantity ?? ""}
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
        {meal.steps.length === 0 ? (
          <p className="text-sm text-app-text-subtle">Aucune étape.</p>
        ) : (
          <ol className="space-y-2">
            {meal.steps.map((step, idx) => (
              <li key={idx} className="flex gap-2 text-sm leading-snug text-app-text">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-app-badge-bg text-xs font-bold text-app-badge-text">
                  {idx + 1}
                </span>
                <span className="min-w-0 flex-1">{step}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        {savedRecipeId ? (
          <Link
            href={`/dashboard/recettes/${savedRecipeId}`}
            className="rounded-md bg-app-primary px-4 py-2 text-sm text-app-on-primary hover:opacity-90"
          >
            Voir dans mon carnet
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => importMeal.mutate({ mealId: meal.id })}
            disabled={importMeal.isPending}
            className="rounded-md bg-app-primary px-4 py-2 text-sm text-app-on-primary hover:opacity-90 disabled:opacity-40"
          >
            {importMeal.isPending ? "Ajout…" : "Ajouter à mon carnet"}
          </button>
        )}
        {meal.youtubeUrl ? (
          <a
            href={meal.youtubeUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-app-border px-4 py-2 text-sm text-app-text hover:bg-app-bg-soft"
          >
            Vidéo
          </a>
        ) : null}
        {meal.sourceUrl ? (
          <a
            href={meal.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-app-border px-4 py-2 text-sm text-app-text hover:bg-app-bg-soft"
          >
            Source
          </a>
        ) : null}
        <Link
          href="/dashboard/recettes"
          className="rounded-md px-4 py-2 text-sm text-app-text-muted hover:bg-app-bg-soft"
        >
          Retour
        </Link>
      </div>

      {importMeal.error ? <p className="text-sm text-app-danger">{importMeal.error.message}</p> : null}
    </article>
  );
}
