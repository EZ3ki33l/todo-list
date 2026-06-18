"use client";

import { useThemeMode } from "@/lib/theme-context";

export function ThemeToggle() {
  const { themeName, toggleTheme } = useThemeMode();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex size-9 items-center justify-center rounded-md border border-app-border-soft bg-app-bg-elevated text-lg hover:bg-app-bg-soft"
      aria-label={themeName === "mocha" ? "Passer au thème clair" : "Passer au thème sombre"}
      title={themeName === "mocha" ? "Thème clair" : "Thème sombre"}
    >
      {themeName === "mocha" ? "🌤️" : "🌙"}
    </button>
  );
}
