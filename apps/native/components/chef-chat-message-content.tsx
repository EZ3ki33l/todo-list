import { Pressable, StyleSheet, Text, View } from "react-native";

import { FluentEmoji } from "@/components/fluent-emoji";
import {
  parseChefMessage,
  stripMd,
  type ParsedRecipe,
  type SectionKind,
} from "@repo/domain/chef-message";

const SECTION_ICONS: Record<SectionKind, string> = {
  ingredients: "🥗",
  steps: "👨‍🍳",
  info: "ℹ️",
};

/** Bouton « Enregistrer » d'une carte recette, piloté par le chat parent. */
export type SaveRecipeState = {
  onSave: () => void;
  saving: boolean;
  saved: boolean;
};

function RecipeCard({ recipe, save }: { recipe: ParsedRecipe; save?: SaveRecipeState }) {
  return (
    <View style={styles.recipeCard}>
      <View style={styles.recipeHeader}>
        <View style={styles.recipeTitleRow}>
          <Text style={styles.recipeTitle}>{recipe.title}</Text>
          {save ? (
            <Pressable
              onPress={save.onSave}
              disabled={save.saved || save.saving}
              style={[styles.saveBtn, (save.saved || save.saving) && { opacity: 0.6 }]}
            >
              <Text style={styles.saveBtnText}>
                {save.saved ? "✓ Enregistrée" : save.saving ? "…" : "Enregistrer"}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {recipe.time ? (
          <View style={styles.recipeTimeRow}>
            <FluentEmoji emoji="⏱️" size={14} />
            <Text style={styles.recipeTime}>{recipe.time}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.recipeBody}>
        {recipe.intro ? <Text style={styles.recipeIntro}>{recipe.intro}</Text> : null}
        {recipe.sections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <View style={styles.sectionLabelRow}>
              <FluentEmoji emoji={SECTION_ICONS[section.kind]} size={14} />
              <Text style={styles.sectionLabel}>
                {section.label || (section.kind === "ingredients" ? "Ingrédients" : "Étapes")}
              </Text>
            </View>
            {section.items.map((item, itemIdx) => (
              <View key={itemIdx} style={styles.sectionRow}>
                {section.kind === "steps" ? (
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{itemIdx + 1}</Text>
                  </View>
                ) : (
                  <Text style={styles.bullet}>•</Text>
                )}
                <Text style={styles.sectionItem}>{item}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

export function ChefChatMessageContent({
  text,
  productsOnly = false,
  saveState,
}: {
  text: string;
  productsOnly?: boolean;
  /** Fourni par le chat pour offrir « Enregistrer » sur chaque recette. */
  saveState?: (recipeIndex: number) => SaveRecipeState;
}) {
  const parsed = parseChefMessage(text);
  const recipes = productsOnly ? [] : parsed.recipes;
  const { intro, seasons } = parsed;

  if (recipes.length === 0 && seasons.length === 0) {
    return (
      <View style={styles.plain}>
        {text.split("\n").map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <View key={idx} style={{ height: 4 }} />;
          return (
            <Text key={idx} style={styles.plainLine}>
              {stripMd(trimmed)}
            </Text>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {intro.length > 0 ? <Text style={styles.intro}>{intro.join(" ")}</Text> : null}
      {recipes.map((recipe, idx) => (
        <RecipeCard key={idx} recipe={recipe} save={saveState?.(idx)} />
      ))}
      {seasons.map((season, idx) => (
        <View key={idx} style={styles.seasonCard}>
          <Text style={styles.seasonTitle}>{season.name}</Text>
          {season.lines.map((line, li) => (
            <Text key={li} style={styles.seasonLine}>
              {line}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  intro: { fontSize: 13, color: "#6B7280", lineHeight: 18, marginBottom: 2 },
  plain: { gap: 4 },
  plainLine: { fontSize: 14, color: "#374151", lineHeight: 20 },
  recipeCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  recipeHeader: {
    backgroundColor: "#FFF7ED",
    borderBottomWidth: 1,
    borderBottomColor: "#FFEDD5",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  recipeTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  recipeTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#111827", lineHeight: 20 },
  saveBtn: {
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  saveBtnText: { fontSize: 11, fontWeight: "600", color: "#9A3412" },
  recipeTimeRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  recipeTime: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9A3412",
  },
  recipeBody: { paddingHorizontal: 12, paddingVertical: 10 },
  recipeIntro: { fontSize: 13, color: "#6B7280", fontStyle: "italic", marginBottom: 6 },
  section: { marginTop: 8 },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9A3412",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sectionRow: { flexDirection: "row", gap: 8, marginBottom: 4, alignItems: "flex-start" },
  bullet: { color: "#FB923C", fontSize: 14, lineHeight: 20, width: 10 },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepBadgeText: { fontSize: 11, fontWeight: "700", color: "#9A3412" },
  sectionItem: { flex: 1, fontSize: 14, color: "#374151", lineHeight: 20 },
  seasonCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#fff",
    padding: 12,
    gap: 4,
  },
  seasonTitle: { fontSize: 14, fontWeight: "700", color: "#14532D" },
  seasonLine: { fontSize: 13, color: "#374151", lineHeight: 18 },
});
