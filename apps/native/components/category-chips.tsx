import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { type GroceryCategory } from "@repo/domain/grocery-detect";
import { CATEGORY_LABELS, PICKABLE_CATEGORIES } from "@repo/domain/grocery-ui";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

type Props = {
  value: GroceryCategory;
  onChange: (c: GroceryCategory) => void;
};

export function CategoryChips({ value, onChange }: Props) {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const styles = getStyles(palette);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
      <View style={styles.chipsRow}>
        {PICKABLE_CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.chip, value === cat && styles.chipActive]}
            onPress={() => onChange(cat)}
          >
            <Text style={[styles.chipText, value === cat && styles.chipTextActive]}>
              {CATEGORY_LABELS[cat]}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function getStyles(palette: ReturnType<typeof getPalette>) {
  return StyleSheet.create({
    chipsScroll: { marginBottom: 4 },
    chipsRow: { flexDirection: "row", gap: 6, paddingRight: 8 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.bgElevated,
    },
    chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    chipText: { fontSize: 12, color: palette.textMuted },
    chipTextActive: { color: palette.onPrimary },
  });
}
