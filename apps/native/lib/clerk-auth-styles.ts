import { StyleSheet } from "react-native";
import type { ThemeName } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

export function getClerkAuthStyles(themeName: ThemeName) {
  const palette = getPalette(themeName);
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: palette.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: palette.textMuted,
    marginBottom: 24,
    textAlign: "center",
  },
  logo: {
    width: 96,
    height: 96,
    alignSelf: "center",
    marginBottom: 16,
    borderRadius: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.textMuted,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: palette.bgElevated,
    color: palette.text,
    marginBottom: 12,
  },
  button: {
    backgroundColor: palette.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: palette.onPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    gap: 4,
  },
  linkText: {
    fontSize: 14,
    color: palette.textMuted,
  },
  linkAction: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.primary,
  },
  error: {
    color: palette.danger,
    fontSize: 13,
    marginBottom: 8,
  },
  secondaryButton: {
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.primary,
  },
  googleButton: {
    backgroundColor: palette.bgElevated,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  googleButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "600",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.borderSoft,
  },
  dividerText: {
    fontSize: 13,
    color: palette.textSubtle,
    fontWeight: "500",
  },
});
}
