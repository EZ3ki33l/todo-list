import { defaultConfig } from "@tamagui/config/v5";
import { createTamagui } from "tamagui";

const latte = {
  ...defaultConfig.themes.light,
  background: "#eff1f5",
  backgroundHover: "#e6e9ef",
  backgroundPress: "#dce0e8",
  color: "#4c4f69",
  colorHover: "#5c5f77",
  colorPress: "#6c6f85",
  borderColor: "#bcc0cc",
  borderColorHover: "#acb0be",
  borderColorPress: "#9ca0b0",
  placeholderColor: "#8c8fa1",
};

const mocha = {
  ...defaultConfig.themes.dark,
  background: "#1e1e2e",
  backgroundHover: "#181825",
  backgroundPress: "#313244",
  color: "#cdd6f4",
  colorHover: "#bac2de",
  colorPress: "#a6adc8",
  borderColor: "#45475a",
  borderColorHover: "#585b70",
  borderColorPress: "#6c7086",
  placeholderColor: "#7f849c",
};

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  themes: {
    ...defaultConfig.themes,
    latte,
    mocha,
    light: latte,
    dark: mocha,
  },
});

export default tamaguiConfig;

export type Conf = typeof tamaguiConfig;

declare module "tamagui" {
  interface TamaguiCustomConfig extends Conf {}
}
