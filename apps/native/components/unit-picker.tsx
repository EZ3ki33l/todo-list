import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SHOPPING_UNITS } from "@/lib/grocery-ui";

type Props = {
  value: string | null;
  onChange: (unit: string | null) => void;
  label?: string;
};

export function UnitPicker({ value, onChange, label = "Conditionnement (facultatif)" }: Props) {
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

const styles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  label: { fontSize: 12, color: "#6B7280", marginBottom: 6 },
  row: { flexDirection: "row", gap: 6, paddingRight: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  chipText: { fontSize: 12, color: "#374151" },
  chipTextActive: { color: "#fff" },
});
