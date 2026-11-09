import { StyleSheet } from "react-native";

import type { AppPalette } from "@/lib/theme-palette";

/** Styles partagés par les écrans Recettes (carnet, catalogue, détail, formulaire). */
export function getRecipeStyles(palette: AppPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    container: { flex: 1, backgroundColor: palette.bg },
    content: { padding: 16, paddingBottom: 48 },

    tabsRow: {
      flexDirection: "row",
      gap: 4,
      backgroundColor: palette.bgElevated,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      padding: 4,
      marginBottom: 14,
    },
    tab: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
    tabActive: { backgroundColor: palette.badgeBg },
    tabText: { fontSize: 13, color: palette.textMuted },
    tabTextActive: { color: palette.text, fontWeight: "600" },

    searchRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      backgroundColor: palette.bgElevated,
      color: palette.text,
    },
    primaryBtn: {
      backgroundColor: palette.primary,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryBtnText: { color: palette.onPrimary, fontSize: 14, fontWeight: "600" },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryBtnText: { color: palette.text, fontSize: 14 },
    dangerBtn: {
      borderWidth: 1,
      borderColor: palette.borderSoft,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    dangerBtnText: { color: palette.danger, fontSize: 14 },

    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: palette.bgElevated,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      overflow: "hidden",
      marginBottom: 8,
    },
    cardThumb: { width: 72, height: 72, backgroundColor: palette.bgSoft },
    cardMain: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
    cardTitleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
    cardTitle: { fontSize: 14, fontWeight: "600", color: palette.text, flexShrink: 1 },
    cardMeta: { fontSize: 12, color: palette.textSubtle, marginTop: 3 },
    cardDelete: {
      borderLeftWidth: 1,
      borderLeftColor: palette.borderSoft,
      paddingHorizontal: 14,
      alignSelf: "stretch",
      justifyContent: "center",
    },
    cardDeleteText: { fontSize: 16, color: palette.danger },

    hint: { fontSize: 12, color: palette.textSubtle, marginBottom: 12, lineHeight: 17 },
    empty: { fontSize: 13, color: palette.textSubtle, fontStyle: "italic", paddingVertical: 8 },
    error: { fontSize: 13, color: palette.danger, paddingVertical: 8 },

    heroImage: { width: "100%", aspectRatio: 16 / 9, backgroundColor: palette.bgSoft },
    detailTitle: { fontSize: 20, fontWeight: "700", color: palette.text },
    detailMeta: { fontSize: 13, color: palette.textSubtle, marginTop: 2 },
    detailNotes: {
      fontSize: 13,
      color: palette.textMuted,
      fontStyle: "italic",
      marginTop: 6,
      lineHeight: 18,
    },

    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 22,
      marginBottom: 8,
    },
    sectionTitle: { fontSize: 15, fontWeight: "700", color: palette.text },

    ingredientRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 5,
    },
    ingredientTitle: { flex: 1, fontSize: 14, color: palette.text },
    ingredientQty: { fontSize: 13, color: palette.textMuted },

    stepRow: { flexDirection: "row", gap: 10, marginBottom: 10, alignItems: "flex-start" },
    stepBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: palette.badgeBg,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    stepBadgeText: { fontSize: 11, fontWeight: "700", color: palette.badgeText },
    stepText: { flex: 1, fontSize: 14, color: palette.text, lineHeight: 20 },

    fieldLabel: { fontSize: 12, color: palette.textSubtle, marginBottom: 5 },
    field: { marginBottom: 12 },
    fieldRow: { flexDirection: "row", gap: 8 },
    actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 24 },
    chipRemove: { paddingHorizontal: 6, paddingVertical: 2 },
    chipRemoveText: { fontSize: 16, color: palette.danger },
  });
}
