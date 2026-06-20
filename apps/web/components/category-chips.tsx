"use client";

import type { GroceryCategory } from "@repo/domain/grocery-detect";
import { CATEGORY_LABELS, PICKABLE_CATEGORIES } from "@repo/domain/grocery-ui";

export function CategoryChips({
  value,
  onChange,
}: {
  value: GroceryCategory;
  onChange: (c: GroceryCategory) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PICKABLE_CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onChange(cat)}
          className={`rounded-full border px-2.5 py-1 text-xs ${
            value === cat
              ? "border-app-primary bg-app-primary text-app-on-primary"
              : "border-app-border-soft bg-app-bg-elevated text-app-text hover:bg-app-bg-soft"
          }`}
        >
          {CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}
