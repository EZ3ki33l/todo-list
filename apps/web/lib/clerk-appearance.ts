import { getPalette, type ThemeName } from "@/lib/theme";

export function getClerkAppearance(themeName: ThemeName) {
  const palette = getPalette(themeName);

  return {
    variables: {
      colorPrimary: palette.primary,
      colorBackground: palette.bgElevated,
      colorText: palette.text,
      colorTextSecondary: palette.textMuted,
      colorInputBackground: palette.bgElevated,
      colorInputText: palette.text,
      colorNeutral: palette.textMuted,
      borderRadius: "0.5rem",
    },
    elements: {
      card: {
        backgroundColor: palette.bgElevated,
        borderColor: palette.borderSoft,
        boxShadow: "none",
      },
      formButtonPrimary: {
        backgroundColor: palette.primary,
        color: palette.onPrimary,
      },
      footerActionLink: {
        color: palette.primary,
      },
      identityPreviewEditButton: {
        color: palette.primary,
      },
    },
  };
}
