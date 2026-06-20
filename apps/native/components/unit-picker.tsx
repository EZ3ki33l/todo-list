import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SHOPPING_UNITS } from "@repo/domain/grocery-ui";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

type Props = {
  value: string | null;
  onChange: (unit: string | null) => void;
  label?: string;
};

export function UnitPicker({ value, onChange, label = "Conditionnement (facultatif)" }: Props) {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const styles = getStyles(palette);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {SHOPPING_UNITS.map((u) => {
            const selected = (value ?? null) === u.value;
            return (
              <Pressable
                key={u.value ?? "_none"}
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => onChange(u.value)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                  {u.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function getStyles(palette: ReturnType<typeof getPalette>) {
  return StyleSheet.create({
  wrap: { marginBottom: 10 },
  label: { fontSize: 12, color: palette.textMuted, marginBottom: 6 },
  row: { flexDirection: "row", gap: 6, paddingRight: 8 },
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
