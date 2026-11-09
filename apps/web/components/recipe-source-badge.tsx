"use client";

import { FluentEmoji } from "@/components/fluent-emoji";
import { recipeSourceBadge } from "@repo/domain/recipe-source";

export function RecipeSourceBadge({ source }: { source: string }) {
  const badge = recipeSourceBadge(source);
  if (!badge) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-app-badge-bg px-2 py-0.5 text-xs font-medium text-app-badge-text">
      <FluentEmoji emoji={badge.emoji} size={12} />
      {badge.label}
    </span>
  );
}
