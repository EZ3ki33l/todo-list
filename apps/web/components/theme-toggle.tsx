"use client";

import { FluentEmoji } from "@/components/fluent-emoji";
import { useThemeMode } from "@/lib/theme-context";

export function ThemeToggle() {
  const { ready, themeName, toggleTheme } = useThemeMode();

  if (!ready) {
    return (
      <span
        className="inline-flex size-9 items-center justify-center rounded-md border border-app-border-soft bg-app-bg-elevated opacity-70"
        aria-label="Chargement du thème"
      >
        <span className="inline-block size-[22px]" aria-hidden />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex size-9 items-center justify-center rounded-md border border-app-border-soft bg-app-bg-elevated text-lg hover:bg-app-bg-soft"
      aria-label={themeName === "mocha" ? "Passer au thème clair" : "Passer au thème sombre"}
      title={themeName === "mocha" ? "Thème clair" : "Thème sombre"}
    >
      <FluentEmoji emoji={themeName === "mocha" ? "🌤️" : "🌙"} size={22} />
    </button>
  );
}
