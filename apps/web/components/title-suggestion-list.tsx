"use client";

import { FluentEmoji } from "@/components/fluent-emoji";
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
      className="mt-1 overflow-hidden rounded-md border border-app-border-soft bg-app-bg-soft"
      role="listbox"
    >
      {suggestions.map((s, index) => (
        <li key={`${s.source}-${normalizeItemTitle(s.title)}`} role="option">
          <button
            type="button"
            onClick={() => onSelect(s)}
            className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-app-bg-soft ${
              index < suggestions.length - 1 ? "border-b border-app-border-soft" : ""
            }`}
          >
            <FluentEmoji emoji={itemIcon(s.category, null, s.title)} size={20} />
            <span className="flex-1 font-medium text-app-text">{s.title}</span>
            <span className="text-xs text-app-text-subtle">{suggestionMeta(s)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
