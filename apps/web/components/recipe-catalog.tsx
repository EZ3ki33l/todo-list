"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { FluentEmoji } from "@/components/fluent-emoji";
import { trpc } from "@/lib/trpc";

const SEARCH_DEBOUNCE_MS = 350;

export function RecipeCatalog() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("");
  const [area, setArea] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filters = trpc.recipes.catalogFilters.useQuery();
  const query = trpc.recipes.catalogSearch.useQuery({
    query: debounced || undefined,
    category: debounced ? undefined : category || undefined,
    area: debounced ? undefined : area || undefined,
  });
  const randomMeal = trpc.recipes.catalogRandom.useMutation({
    onSuccess: (data) => {
      router.push(`/dashboard/recettes/catalogue/${data.meal.id}`);
    },
  });

  const meals = query.data?.items ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-app-text-subtle">
        Recettes du catalogue TheMealDB. La recherche comprend le français
        (poulet, pâtes, soupe…) : les titres affichés restent ceux de la base, souvent en anglais.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un plat (ex. poulet, pâtes, soupe…)"
          aria-label="Rechercher dans TheMealDB"
          className="min-w-[14rem] flex-1 rounded-md border border-app-border bg-app-bg-elevated px-3 py-2 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-primary"
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            if (e.target.value) setSearch("");
          }}
          disabled={Boolean(debounced)}
          aria-label="Catégorie"
          className="rounded-md border border-app-border bg-app-bg-elevated px-3 py-2 text-sm text-app-text disabled:opacity-40"
        >
          <option value="">Toutes les catégories</option>
          {(filters.data?.categories ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={area}
          onChange={(e) => {
            setArea(e.target.value);
            if (e.target.value) setSearch("");
          }}
          disabled={Boolean(debounced)}
          aria-label="Cuisine"
          className="rounded-md border border-app-border bg-app-bg-elevated px-3 py-2 text-sm text-app-text disabled:opacity-40"
        >
          <option value="">Cuisine française (défaut)</option>
          {(filters.data?.areas ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => randomMeal.mutate()}
          disabled={randomMeal.isPending}
          className="rounded-md border border-app-border px-3 py-2 text-sm text-app-text hover:bg-app-bg-soft disabled:opacity-40"
        >
          {randomMeal.isPending ? "Tirage…" : "Au hasard"}
        </button>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-app-text-subtle">Chargement du catalogue…</p>
      ) : query.error ? (
        <p className="text-sm text-app-danger">{query.error.message}</p>
      ) : meals.length === 0 ? (
        <p className="text-sm text-app-text-subtle">Aucune recette ne correspond à cette recherche.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {meals.map((meal) => (
            <li key={meal.id}>
              <Link
                href={`/dashboard/recettes/catalogue/${meal.id}`}
                className="block overflow-hidden rounded-lg border border-app-border-soft bg-app-badge-bg/40 shadow-sm transition-colors hover:bg-app-badge-bg/70"
              >
                <div className="relative aspect-[4/3] bg-app-bg-soft">
                  <Image
                    src={meal.thumbUrl}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="space-y-0.5 px-3 py-2">
                  <p className="font-medium leading-snug text-app-text">{meal.title}</p>
                  <p className="flex items-center gap-1 text-xs text-app-text-subtle">
                    <FluentEmoji emoji="🍽️" size={12} />
                    {[meal.areaLabel, meal.categoryLabel].filter(Boolean).join(" · ") || "TheMealDB"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {randomMeal.error ? (
        <p className="text-sm text-app-danger">{randomMeal.error.message}</p>
      ) : null}
    </div>
  );
}
