"use client";

import type { GroceryCategory } from "@/lib/grocery-detect";
import { CATEGORY_LABELS, PICKABLE_CATEGORIES } from "@/lib/grocery-ui";

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
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          {CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}
