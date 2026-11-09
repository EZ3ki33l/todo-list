"use client";

import { useState } from "react";

import { FluentEmoji } from "@/components/fluent-emoji";
import { CATEGORY_LABELS, PICKABLE_CATEGORIES, itemIcon } from "@repo/domain/grocery-ui";
import { detectCategory, type GroceryCategory } from "@repo/domain/grocery-detect";
import { parseQuantity } from "@repo/domain/shopping-quantity";

export type RecipeFormIngredient = {
  title: string;
  quantity: number | null;
  unit: string | null;
  category: GroceryCategory;
};

export type RecipeFormValue = {
  title: string;
  timeLabel: string | null;
  servings: number | null;
  notes: string | null;
  ingredients: RecipeFormIngredient[];
  steps: string[];
};

const EMPTY: RecipeFormValue = {
  title: "",
  timeLabel: null,
  servings: null,
  notes: null,
  ingredients: [],
  steps: [],
};

const inputClass =
  "w-full rounded-md border border-app-border bg-app-bg-elevated px-3 py-2 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-primary";

export function RecipeForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: RecipeFormValue;
  submitLabel: string;
  pending: boolean;
  error?: string | null;
  onSubmit: (value: RecipeFormValue) => void;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState<RecipeFormValue>(initial ?? EMPTY);
  const [ingredientDraft, setIngredientDraft] = useState("");
  const [quantityDraft, setQuantityDraft] = useState("");
  const [unitDraft, setUnitDraft] = useState("");
  const [stepDraft, setStepDraft] = useState("");

  function patch(next: Partial<RecipeFormValue>) {
    setValue((v) => ({ ...v, ...next }));
  }

  function addIngredient() {
    const title = ingredientDraft.trim();
    if (!title) return;
    patch({
      ingredients: [
        ...value.ingredients,
        {
          title,
          quantity: parseQuantity(quantityDraft),
          unit: unitDraft.trim() || null,
          category: detectCategory(title) ?? "AUTRE",
        },
      ],
    });
    setIngredientDraft("");
    setQuantityDraft("");
    setUnitDraft("");
  }

  function addStep() {
    const text = stepDraft.trim();
    if (!text) return;
    patch({ steps: [...value.steps, text] });
    setStepDraft("");
  }

  function moveStep(index: number, delta: number) {
    const next = [...value.steps];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    patch({ steps: next });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.title.trim()) return;
    onSubmit({ ...value, title: value.title.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <label className="block">
          <span className="mb-1 block text-xs text-app-text-subtle">Titre</span>
          <input
            type="text"
            value={value.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Ex. Gratin de courgettes"
            required
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-app-text-subtle">Temps</span>
          <input
            type="text"
            value={value.timeLabel ?? ""}
            onChange={(e) => patch({ timeLabel: e.target.value || null })}
            placeholder="45 min"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-app-text-subtle">Parts</span>
          <input
            type="number"
            min={1}
            max={100}
            value={value.servings ?? ""}
            onChange={(e) =>
              patch({ servings: e.target.value ? Number(e.target.value) : null })
            }
            placeholder="4"
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs text-app-text-subtle">Notes (facultatif)</span>
        <textarea
          value={value.notes ?? ""}
          onChange={(e) => patch({ notes: e.target.value || null })}
          rows={2}
          placeholder="Un grand classique…"
          className={inputClass}
        />
      </label>

      <section className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-app-text">
          <FluentEmoji emoji="🥗" size={16} />
          Ingrédients
        </h3>

        {value.ingredients.length > 0 ? (
          <ul className="space-y-1.5">
            {value.ingredients.map((ingredient, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 rounded-md border border-app-border-soft bg-app-badge-bg/30 px-3 py-2"
              >
                <FluentEmoji
                  emoji={itemIcon(ingredient.category, null, ingredient.title)}
                  size={18}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-app-text">
                  {ingredient.title}
                </span>
                {ingredient.quantity !== null ? (
                  <span className="text-xs text-app-text-muted">
                    {ingredient.quantity}
                    {ingredient.unit ? ` ${ingredient.unit}` : ""}
                  </span>
                ) : null}
                <select
                  value={ingredient.category}
                  onChange={(e) => {
                    const next = [...value.ingredients];
                    next[idx] = {
                      ...ingredient,
                      category: e.target.value as GroceryCategory,
                    };
                    patch({ ingredients: next });
                  }}
                  aria-label={`Catégorie de ${ingredient.title}`}
                  className="rounded border border-app-border-soft bg-app-bg-elevated px-1.5 py-0.5 text-xs text-app-text-muted"
                >
                  {PICKABLE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    patch({ ingredients: value.ingredients.filter((_, i) => i !== idx) })
                  }
                  aria-label={`Retirer ${ingredient.title}`}
                  className="px-1 text-app-danger hover:opacity-70"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-app-text-subtle">Aucun ingrédient pour l'instant.</p>
        )}

        <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <input
            type="text"
            value={ingredientDraft}
            onChange={(e) => setIngredientDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addIngredient();
              }
            }}
            placeholder="Courgettes"
            aria-label="Nouvel ingrédient"
            className={inputClass}
          />
          <input
            type="text"
            inputMode="decimal"
            value={quantityDraft}
            onChange={(e) => setQuantityDraft(e.target.value)}
            placeholder="600"
            aria-label="Quantité"
            className={inputClass}
          />
          <input
            type="text"
            value={unitDraft}
            onChange={(e) => setUnitDraft(e.target.value)}
            placeholder="g"
            aria-label="Unité"
            className={inputClass}
          />
          <button
            type="button"
            onClick={addIngredient}
            disabled={!ingredientDraft.trim()}
            className="rounded-md border border-app-border px-3 py-2 text-sm text-app-text hover:bg-app-bg-soft disabled:opacity-40"
          >
            Ajouter
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-app-text">
          <FluentEmoji emoji="👨‍🍳" size={16} />
          Étapes
        </h3>

        {value.steps.length > 0 ? (
          <ol className="space-y-1.5">
            {value.steps.map((step, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 rounded-md border border-app-border-soft bg-app-badge-bg/30 px-3 py-2"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-app-badge-bg text-xs font-bold text-app-badge-text">
                  {idx + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm leading-snug text-app-text">{step}</span>
                <button
                  type="button"
                  onClick={() => moveStep(idx, -1)}
                  disabled={idx === 0}
                  aria-label={`Monter l'étape ${idx + 1}`}
                  className="px-1 text-app-text-muted hover:text-app-text disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(idx, 1)}
                  disabled={idx === value.steps.length - 1}
                  aria-label={`Descendre l'étape ${idx + 1}`}
                  className="px-1 text-app-text-muted hover:text-app-text disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => patch({ steps: value.steps.filter((_, i) => i !== idx) })}
                  aria-label={`Retirer l'étape ${idx + 1}`}
                  className="px-1 text-app-danger hover:opacity-70"
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-app-text-subtle">Aucune étape pour l'instant.</p>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={stepDraft}
            onChange={(e) => setStepDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addStep();
              }
            }}
            placeholder="Émincer les courgettes"
            aria-label="Nouvelle étape"
            className={inputClass}
          />
          <button
            type="button"
            onClick={addStep}
            disabled={!stepDraft.trim()}
            className="shrink-0 rounded-md border border-app-border px-3 py-2 text-sm text-app-text hover:bg-app-bg-soft disabled:opacity-40"
          >
            Ajouter
          </button>
        </div>
      </section>

      {error ? <p className="text-sm text-app-danger">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!value.title.trim() || pending}
          className="rounded-md bg-app-primary px-4 py-2 text-sm text-app-on-primary hover:opacity-90 disabled:opacity-40"
        >
          {pending ? "Enregistrement…" : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-app-border-soft px-4 py-2 text-sm text-app-text-muted hover:bg-app-bg-soft"
          >
            Annuler
          </button>
        ) : null}
      </div>
    </form>
  );
}
