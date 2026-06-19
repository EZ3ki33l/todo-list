"use client";

import { DEFAULT_THEME_NAME, THEME_STORAGE_KEY, type ThemeName } from "@/lib/theme";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type ThemeContextValue = {
  ready: boolean;
  themeName: ThemeName;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemeName | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return raw === "latte" || raw === "mocha" ? raw : null;
  } catch {
    return null;
  }
}

function readThemeFromDocument(): ThemeName {
  const fromDom = document.documentElement.dataset.theme;
  if (fromDom === "latte" || fromDom === "mocha") return fromDom;
  return readStoredTheme() ?? DEFAULT_THEME_NAME;
}

function applyThemeToDocument(themeName: ThemeName) {
  document.documentElement.dataset.theme = themeName;
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  // Même valeur que ThemeScript (SSR + hydratation) pour éviter un mismatch.
  const [themeName, setThemeName] = useState<ThemeName>(DEFAULT_THEME_NAME);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setThemeName(readThemeFromDocument());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyThemeToDocument(themeName);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeName);
    } catch {
      // ignore
    }
  }, [ready, themeName]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      ready,
      themeName,
      toggleTheme: () => {
        setThemeName((current) => (current === "latte" ? "mocha" : "latte"));
      },
    }),
    [ready, themeName],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeMode doit être utilisé dans ThemeModeProvider");
  return ctx;
}
