export type ThemeName = "latte" | "mocha";

export type AppPalette = {
  bg: string;
  bgElevated: string;
  bgSoft: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  borderSoft: string;
  primary: string;
  onPrimary: string;
  badgeBg: string;
  badgeText: string;
  danger: string;
  skeleton: string;
  logoTint?: string;
};

const latte: AppPalette = {
  bg: "#eff1f5",
  bgElevated: "#ffffff",
  bgSoft: "#e6e9ef",
  text: "#4c4f69",
  textMuted: "#6c6f85",
  textSubtle: "#8c8fa1",
  border: "#bcc0cc",
  borderSoft: "#dce0e8",
  primary: "#1e66f5",
  onPrimary: "#ffffff",
  badgeBg: "#dce0e8",
  badgeText: "#1e66f5",
  danger: "#d20f39",
  skeleton: "#ccd0da",
};

const mocha: AppPalette = {
  logoTint: "#cdd6f4",
  bg: "#1e1e2e",
  bgElevated: "#313244",
  bgSoft: "#181825",
  text: "#cdd6f4",
  textMuted: "#a6adc8",
  textSubtle: "#9399b2",
  border: "#585b70",
  borderSoft: "#45475a",
  primary: "#89b4fa",
  onPrimary: "#1e1e2e",
  badgeBg: "#45475a",
  badgeText: "#89b4fa",
  danger: "#f38ba8",
  skeleton: "#45475a",
};

export function getPalette(themeName: ThemeName): AppPalette {
  return themeName === "mocha" ? mocha : latte;
}

export const THEME_STORAGE_KEY = "ui_theme_name";
