import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getPalette, type AppPalette } from "@repo/theme";

import { FluentEmoji } from "@/components/fluent-emoji";
import { normalizeItemTitle, type TitleSuggestion } from "@repo/domain/grocery-detect";
import { CATEGORY_LABELS, itemIcon } from "@repo/domain/grocery-ui";
import { useThemeMode } from "@/lib/theme-context";

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
  const { themeName } = useThemeMode();
  const styles = useMemo(() => getStyles(getPalette(themeName)), [themeName]);

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
          <FluentEmoji emoji={itemIcon(s.category, null, s.title)} size={18} />
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.meta}>{suggestionMeta(s)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function getStyles(p: AppPalette) {
  return StyleSheet.create({
    box: {
      marginTop: 4,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: p.borderSoft,
      borderRadius: 10,
      backgroundColor: p.bgSoft,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.borderSoft,
    },
    rowLast: { borderBottomWidth: 0 },
    title: { flex: 1, fontSize: 15, color: p.text, fontWeight: "500" },
    meta: { fontSize: 12, color: p.textMuted },
  });
}
