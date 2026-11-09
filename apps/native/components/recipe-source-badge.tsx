import { StyleSheet, Text, View } from "react-native";

import { recipeSourceBadge } from "@repo/domain/recipe-source";
import { FluentEmoji } from "@/components/fluent-emoji";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

export function RecipeSourceBadge({ source }: { source: string }) {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const badge = recipeSourceBadge(source);

  if (!badge) return null;

  return (
    <View style={[styles.badge, { backgroundColor: palette.badgeBg }]}>
      <FluentEmoji emoji={badge.emoji} size={11} />
      <Text style={[styles.label, { color: palette.badgeText }]}>{badge.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  label: { fontSize: 11, fontWeight: "600" },
});
