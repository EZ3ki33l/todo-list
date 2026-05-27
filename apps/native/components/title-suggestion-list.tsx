import { Pressable, StyleSheet, Text, View } from "react-native";

import { normalizeItemTitle, type TitleSuggestion } from "@/lib/grocery-detect";
import { CATEGORY_LABELS, itemIcon } from "@/lib/grocery-ui";

function suggestionMeta(s: TitleSuggestion): string {
  if (s.source === "history") return "Récent";
  if (s.source === "list") return "Liste";
  return CATEGORY_LABELS[s.category];
}

export function TitleSuggestionList({
  suggestions,
  onSelect,
}: {
  suggestions: TitleSuggestion[];
  onSelect: (s: TitleSuggestion) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <View style={styles.box}>
      {suggestions.map((s, index) => (
        <Pressable
          key={`${s.source}-${normalizeItemTitle(s.title)}`}
          style={[
            styles.row,
            index === suggestions.length - 1 && styles.rowLast,
          ]}
          onPress={() => onSelect(s)}
        >
          <Text style={styles.icon}>{itemIcon(s.category)}</Text>
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.meta}>{suggestionMeta(s)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  rowLast: { borderBottomWidth: 0 },
  icon: { fontSize: 18 },
  title: { flex: 1, fontSize: 15, color: "#111827", fontWeight: "500" },
  meta: { fontSize: 12, color: "#6B7280" },
});
