import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";

import { THEME_STORAGE_KEY, type ThemeName } from "@repo/theme";

type ThemeContextValue = {
  ready: boolean;
  themeName: ThemeName;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function storeGetTheme(): Promise<ThemeName | null> {
  if (Platform.OS === "web") {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return raw === "latte" || raw === "mocha" ? raw : null;
  }

  const SecureStore = await import("expo-secure-store");
  const raw = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
  return raw === "latte" || raw === "mocha" ? raw : null;
}

async function storeSetTheme(themeName: ThemeName) {
  if (Platform.OS === "web") {
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
    return;
  }

  const SecureStore = await import("expo-secure-store");
  await SecureStore.setItemAsync(THEME_STORAGE_KEY, themeName);
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>("latte");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await storeGetTheme();
        if (cancelled) return;
        if (stored) setThemeName(stored);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      ready,
      themeName,
      toggleTheme: () => {
        const next = themeName === "latte" ? "mocha" : "latte";
        setThemeName(next);
        void storeSetTheme(next);
      },
    }),
    [ready, themeName],
  );

  // Évite le flash latte → mocha au démarrage (thème lu de façon asynchrone).
  if (!ready) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeMode doit être utilisé dans ThemeModeProvider");
  return ctx;
}
