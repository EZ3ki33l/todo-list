import { StyleSheet, Text, View } from "react-native";

type ParsedSection = {
  kind: "ingredients" | "steps";
  label: string;
  items: string[];
};

type ParsedRecipe = {
  title: string;
  time?: string;
  intro?: string;
  sections: ParsedSection[];
};

function stripMd(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function isRecipeTitle(line: string): boolean {
  const t = line.trim();
  return /^\*\*(\d+\.\s*)?.+\*\*$/.test(t) && !/^(Printemps|Été|Automne|Hiver)/i.test(stripMd(t));
}

function isSeasonTitle(line: string): boolean {
  return /^(Printemps|Été|Automne|Hiver)$/i.test(stripMd(line.trim()));
}

function sectionKind(line: string): "ingredients" | "steps" | null {
  const t = stripMd(line).toLowerCase();
  if (t.includes("ingrédient") || line.includes("📝")) return "ingredients";
  if (t.includes("étape") || line.includes("👨‍🍳")) return "steps";
  return null;
}

function isListLine(line: string): boolean {
  return /^[-•*]\s+/.test(line.trim()) || /^\d+\.\s+/.test(line.trim());
}

function listItemText(line: string): string {
  return stripMd(line.trim().replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, ""));
}

function parseTime(line: string): string | undefined {
  if (!/⏱|temps|min/i.test(line)) return undefined;
  return stripMd(line.replace(/^⏱️?\s*/, ""));
}

function parseRecipes(text: string): { intro: string; recipes: ParsedRecipe[]; seasons: { name: string; lines: string[] }[] } {
  const lines = text.split("\n");
  const recipes: ParsedRecipe[] = [];
  const seasons: { name: string; lines: string[] }[] = [];
  const introParts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (isSeasonTitle(line)) {
      const season = { name: stripMd(line), lines: [] as string[] };
      i++;
      while (i < lines.length && !isSeasonTitle(lines[i] ?? "") && !isRecipeTitle(lines[i] ?? "")) {
        const l = (lines[i] ?? "").trim();
        if (l) season.lines.push(stripMd(l));
        i++;
      }
      seasons.push(season);
      continue;
    }

    if (isRecipeTitle(line)) {
      const recipe: ParsedRecipe = { title: stripMd(line).replace(/^\d+\.\s*/, ""), sections: [] };
      i++;
      while (i < lines.length && !isRecipeTitle(lines[i] ?? "") && !isSeasonTitle(lines[i] ?? "")) {
        const l = (lines[i] ?? "").trim();
        if (!l) {
          i++;
          continue;
        }
        const time = parseTime(l);
        if (time) {
          recipe.time = time;
          i++;
          continue;
        }
        const kind = sectionKind(l);
        if (kind) {
          const section: ParsedSection = {
            kind,
            label: stripMd(l.replace(/^📝\s*|^👨‍🍳\s*/, "")),
            items: [],
          };
          i++;
          while (i < lines.length) {
            const next = (lines[i] ?? "").trim();
            if (!next) {
              i++;
              continue;
            }
            if (sectionKind(next) || isRecipeTitle(next) || isSeasonTitle(next) || parseTime(next)) break;
            if (isListLine(next) || kind === "steps") {
              section.items.push(listItemText(next));
              i++;
              continue;
            }
            break;
          }
          recipe.sections.push(section);
          continue;
        }
        if (isListLine(l)) {
          const last = recipe.sections[recipe.sections.length - 1];
          if (last) last.items.push(listItemText(l));
          else if (!recipe.intro) recipe.intro = listItemText(l);
        } else if (!recipe.intro && recipe.sections.length === 0) {
          recipe.intro = stripMd(l);
        }
        i++;
      }
      recipes.push(recipe);
      continue;
    }

    if (trimmed && recipes.length === 0 && seasons.length === 0) introParts.push(stripMd(trimmed));
    i++;
  }

  return { intro: introParts.join(" "), recipes, seasons };
}

function RecipeCard({ recipe }: { recipe: ParsedRecipe }) {
  return (
    <View style={styles.recipeCard}>
      <View style={styles.recipeHeader}>
        <Text style={styles.recipeTitle}>{recipe.title}</Text>
        {recipe.time ? <Text style={styles.recipeTime}>⏱ {recipe.time}</Text> : null}
      </View>
      <View style={styles.recipeBody}>
        {recipe.intro ? <Text style={styles.recipeIntro}>{recipe.intro}</Text> : null}
        {recipe.sections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionLabel}>
              {section.kind === "ingredients" ? "🥗 " : "👨‍🍳 "}
              {section.label || (section.kind === "ingredients" ? "Ingrédients" : "Étapes")}
            </Text>
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
}: {
  text: string;
  productsOnly?: boolean;
}) {
  const { intro, recipes: parsedRecipes, seasons } = parseRecipes(text);
  const recipes = productsOnly ? [] : parsedRecipes;

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
      {intro ? <Text style={styles.intro}>{intro}</Text> : null}
      {recipes.map((recipe, idx) => (
        <RecipeCard key={idx} recipe={recipe} />
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
  recipeTitle: { fontSize: 15, fontWeight: "700", color: "#111827", lineHeight: 20 },
  recipeTime: {
    marginTop: 6,
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: "600",
    color: "#9A3412",
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  recipeBody: { paddingHorizontal: 12, paddingVertical: 10 },
  recipeIntro: { fontSize: 13, color: "#6B7280", fontStyle: "italic", marginBottom: 6 },
  section: { marginTop: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9A3412",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
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
