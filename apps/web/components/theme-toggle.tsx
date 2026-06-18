"use client";

import { FluentEmoji } from "@/components/fluent-emoji";
import { useThemeMode } from "@/lib/theme-context";

export function ThemeToggle() {
  const { ready, themeName, toggleTheme } = useThemeMode();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={!ready}
      className="inline-flex size-9 items-center justify-center rounded-md border border-app-border-soft bg-app-bg-elevated text-lg hover:bg-app-bg-soft disabled:opacity-70"
      aria-label={
        !ready
          ? "Chargement du thème"
          : themeName === "mocha"
            ? "Passer au thème clair"
            : "Passer au thème sombre"
      }
      title={!ready ? undefined : themeName === "mocha" ? "Thème clair" : "Thème sombre"}
    >
      {ready ? (
        <FluentEmoji emoji={themeName === "mocha" ? "🌤️" : "🌙"} size={22} />
      ) : (
        <span className="inline-block size-[22px]" aria-hidden />
      )}
    </button>
  );
}
