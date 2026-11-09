"use client";

import Link from "next/link";
import { useState } from "react";

import { RecipeCatalog } from "@/components/recipe-catalog";
import { RecipeForm, type RecipeFormValue } from "@/components/recipe-form";
import { RecipeSourceBadge } from "@/components/recipe-source-badge";
import { TrashIcon } from "@/components/trash-icon";
import { confirmPermanentDelete } from "@/lib/confirm-delete";
import { trpc } from "@/lib/trpc";

const PAGE_SIZE = 20;

function recipeSubtitle(recipe: {
  timeLabel: string | null;
  servings: number | null;
  _count: { ingredients: number; steps: number };
}) {
  const parts: string[] = [];
  if (recipe.timeLabel) parts.push(recipe.timeLabel);
  if (recipe.servings) parts.push(`${recipe.servings} part${recipe.servings > 1 ? "s" : ""}`);
  parts.push(
    `${recipe._count.ingredients} ingrédient${recipe._count.ingredients > 1 ? "s" : ""}`,
  );
  if (recipe._count.steps > 0) {
    parts.push(`${recipe._count.steps} étape${recipe._count.steps > 1 ? "s" : ""}`);
  }
  return parts.join(" · ");
}

type BookTab = "book" | "catalog";

export function RecipeBook() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<BookTab>("book");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const query = trpc.recipes.list.useInfiniteQuery(
    { search: search.trim() || undefined, limit: PAGE_SIZE },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  );

  const createRecipe = trpc.recipes.create.useMutation({
    onSuccess: () => {
      setCreating(false);
      void utils.recipes.list.invalidate();
    },
  });

  const deleteRecipe = trpc.recipes.delete.useMutation({
    onSuccess: () => void utils.recipes.list.invalidate(),
  });

  const recipes = query.data?.pages.flatMap((p) => p.items) ?? [];

  function handleCreate(value: RecipeFormValue) {
    createRecipe.mutate({ ...value, source: "MANUAL" });
  }

  function handleDelete(recipeId: string, title: string) {
    if (!confirmPermanentDelete(title)) return;
    deleteRecipe.mutate({ recipeId });
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg border border-app-border-soft bg-app-bg-elevated p-1">
        <button
          type="button"
          onClick={() => setTab("book")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm ${
            tab === "book"
              ? "bg-app-badge-bg font-medium text-app-text"
              : "text-app-text-muted hover:text-app-text"
          }`}
        >
          Mon carnet
        </button>
        <button
          type="button"
          onClick={() => setTab("catalog")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm ${
            tab === "catalog"
              ? "bg-app-badge-bg font-medium text-app-text"
              : "text-app-text-muted hover:text-app-text"
          }`}
        >
          Catalogue TheMealDB
        </button>
      </div>

      {tab === "catalog" ? <RecipeCatalog /> : null}

      {tab === "book" ? (
        <>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un titre ou un ingrédient…"
          aria-label="Rechercher une recette"
          className="min-w-[14rem] flex-1 rounded-md border border-app-border bg-app-bg-elevated px-3 py-2 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-primary"
        />
        {!creating ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-md bg-app-primary px-4 py-2 text-sm text-app-on-primary hover:opacity-90"
          >
            + Nouvelle recette
          </button>
        ) : null}
      </div>

      {creating ? (
        <section className="rounded-xl border border-app-border-soft bg-app-bg-elevated p-4">
          <h2 className="mb-3 text-sm font-semibold text-app-text">Nouvelle recette</h2>
          <RecipeForm
            submitLabel="Enregistrer"
            pending={createRecipe.isPending}
            error={createRecipe.error?.message ?? null}
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </section>
      ) : null}

      {query.isLoading ? (
        <p className="text-sm text-app-text-subtle">Chargement…</p>
      ) : recipes.length === 0 ? (
        <p className="text-sm text-app-text-subtle">
          {search.trim()
            ? "Aucune recette ne correspond à cette recherche."
            : "Votre carnet est vide. Créez une recette, importez-en une depuis TheMealDB, ou enregistrez-en une depuis le Chef IA."}
        </p>
      ) : (
        <ul className="space-y-2">
          {recipes.map((recipe) => (
            <li
              key={recipe.id}
              className="flex overflow-hidden rounded-lg border border-app-border-soft bg-app-badge-bg/40 shadow-sm"
            >
              <Link
                href={`/dashboard/recettes/${recipe.id}`}
                className="flex min-w-0 flex-1 items-stretch transition-colors hover:bg-app-badge-bg/70"
              >
                {recipe.imageUrl ? (
                  <img
                    src={recipe.imageUrl}
                    alt=""
                    className="w-16 shrink-0 object-cover sm:w-20"
                  />
                ) : null}
                <div className="min-w-0 flex-1 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-app-text">{recipe.title}</span>
                    <RecipeSourceBadge source={recipe.source} />
                  </div>
                  <p className="mt-0.5 text-sm text-app-text-subtle">{recipeSubtitle(recipe)}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(recipe.id, recipe.title)}
                disabled={deleteRecipe.isPending}
                aria-label={`Supprimer la recette ${recipe.title}`}
                className="flex shrink-0 items-center border-l border-app-border-soft px-3 text-app-danger transition-colors hover:bg-app-danger-bg disabled:opacity-40"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.hasNextPage ? (
        <button
          type="button"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          className="rounded-md border border-app-border px-4 py-2 text-sm text-app-text hover:bg-app-bg-soft disabled:opacity-40"
        >
          {query.isFetchingNextPage ? "Chargement…" : "Charger plus"}
        </button>
      ) : null}
        </>
      ) : null}
    </div>
  );
}
