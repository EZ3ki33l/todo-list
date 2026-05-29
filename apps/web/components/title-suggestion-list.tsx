"use client";

import {
  normalizeItemTitle,
  type TitleSuggestion,
} from "@/lib/grocery-detect";
import { CATEGORY_LABELS, itemIcon } from "@/lib/grocery-ui";

function suggestionMeta(s: TitleSuggestion): string {
  if (s.source === "history") return "Récent";
  if (s.source === "list") return "Liste";
  return CATEGORY_LABELS[s.category];
}

export function TitleSuggestionList({
  suggestions,
  onSelect,
}: {
  suggestions: TitleSuggestion[];
  onSelect: (s: TitleSuggestion) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <ul
      className="mt-1 overflow-hidden rounded-md border border-gray-200 bg-gray-50"
      role="listbox"
    >
      {suggestions.map((s, index) => (
        <li key={`${s.source}-${normalizeItemTitle(s.title)}`} role="option">
          <button
            type="button"
            onClick={() => onSelect(s)}
            className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-gray-100 ${
              index < suggestions.length - 1 ? "border-b border-gray-200" : ""
            }`}
          >
            <span aria-hidden>{itemIcon(s.category)}</span>
            <span className="flex-1 font-medium text-gray-900">{s.title}</span>
            <span className="text-xs text-gray-500">{suggestionMeta(s)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
