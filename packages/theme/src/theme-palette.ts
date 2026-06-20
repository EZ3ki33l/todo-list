export type ThemeName = "latte" | "mocha";

export const DEFAULT_THEME_NAME: ThemeName = "mocha";

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
  dangerBg: string;
  skeleton: string;
  overlay: string;
  success: string;
  successBg: string;
  recurrenceDailyBg: string;
  recurrenceDailyText: string;
  recurrenceWeeklyBg: string;
  recurrenceWeeklyText: string;
  markerPonctual: string;
  markerPonctualMuted: string;
  markerWeekly: string;
  markerWeeklyMuted: string;
  streakBg: string;
  streakText: string;
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
  dangerBg: "#fff1f2",
  skeleton: "#ccd0da",
  overlay: "rgba(0,0,0,0.4)",
  success: "#16a34a",
  successBg: "#f0fdf4",
  recurrenceDailyBg: "#eff6ff",
  recurrenceDailyText: "#1d4ed8",
  recurrenceWeeklyBg: "#f5f3ff",
  recurrenceWeeklyText: "#6d28d9",
  markerPonctual: "#f59e0b",
  markerPonctualMuted: "#fde68a",
  markerWeekly: "#a855f7",
  markerWeeklyMuted: "#e9d5ff",
  streakBg: "#fff7ed",
  streakText: "#c2410c",
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
  dangerBg: "rgba(243,139,168,0.12)",
  skeleton: "#45475a",
  overlay: "rgba(0,0,0,0.55)",
  success: "#a6e3a1",
  successBg: "rgba(166,227,161,0.12)",
  recurrenceDailyBg: "rgba(137,180,250,0.15)",
  recurrenceDailyText: "#89b4fa",
  recurrenceWeeklyBg: "rgba(203,166,247,0.15)",
  recurrenceWeeklyText: "#cba6f7",
  markerPonctual: "#f9e2af",
  markerPonctualMuted: "rgba(249,226,175,0.4)",
  markerWeekly: "#cba6f7",
  markerWeeklyMuted: "rgba(203,166,247,0.4)",
  streakBg: "rgba(250,179,135,0.15)",
  streakText: "#fab387",
};

export function getPalette(themeName: ThemeName): AppPalette {
  return themeName === "mocha" ? mocha : latte;
}

export const THEME_STORAGE_KEY = "ui_theme_name";
