import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { LoadingLogo } from "@/components/loading-logo";

import { trpc } from "@/lib/trpc";

type Props = {
  listId: string;
  enabled: boolean;
  ingredientCount: number;
  minIngredients?: number;
};

export function RecipeSuggestions({
  listId,
  enabled,
  ingredientCount,
  minIngredients = 2,
}: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const suggest = trpc.recipes.suggestFromList.useMutation();

  if (!enabled) return null;

  const canSuggest = ingredientCount >= minIngredients;
  const recipes = suggest.data?.recipes ?? [];

  function handleSuggest() {
    if (!canSuggest) return;
    setExpandedIndex(null);
    suggest.mutate({ listId, limit: 5, refresh: recipes.length > 0 });
  }
  const errorMessage = suggest.error?.message;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>🍳 Idées repas</Text>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            (suggest.isPending || !canSuggest) && styles.buttonDisabled,
          ]}
          onPress={handleSuggest}
          disabled={suggest.isPending || !canSuggest}
        >
          {suggest.isPending ? (
            <LoadingLogo size={18} tintColor="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {recipes.length > 0 ? "Actualiser" : "Proposer"}
            </Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.disclaimer}>
        Idées variées à partir de vos articles — l'IA peut compléter avec des ingrédients
        courants (sel, huile, épices…).
      </Text>

      {!canSuggest ? (
        <Text style={styles.hint}>
          Ajoutez au moins {minIngredients} articles non cochés pour obtenir des idées.
        </Text>
      ) : null}

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {recipes.map((recipe, index) => {
        const open = expandedIndex === index;
        return (
          <Pressable
            key={`${recipe.title}-${index}`}
            style={styles.card}
            onPress={() => setExpandedIndex(open ? null : index)}
          >
            <Text style={styles.cardTitle}>{recipe.title}</Text>
            {recipe.prepTimeMinutes != null ? (
              <Text style={styles.meta}>⏱ ~{recipe.prepTimeMinutes} min</Text>
            ) : null}
            {recipe.usedIngredients.length > 0 ? (
              <Text style={styles.meta} numberOfLines={open ? undefined : 2}>
                Utilise : {recipe.usedIngredients.join(", ")}
              </Text>
            ) : null}
            {open && recipe.missingIngredients.length > 0 ? (
              <Text style={styles.missing}>
                En plus : {recipe.missingIngredients.join(", ")}
              </Text>
            ) : null}
            {open ? (
              <View style={styles.steps}>
                {recipe.steps.map((step, stepIndex) => (
                  <Text key={stepIndex} style={styles.step}>
                    {stepIndex + 1}. {step}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.tapHint}>Appuyer pour voir les étapes</Text>
            )}
          </Pressable>
        );
      })}

      {suggest.data?.cached ? (
        <Text style={styles.cacheHint}>Résultat en cache (liste inchangée).</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
    backgroundColor: "#FFFBEB",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  button: {
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 88,
    alignItems: "center",
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  disclaimer: { fontSize: 11, color: "#92400E", marginBottom: 4, lineHeight: 15 },
  hint: { fontSize: 11, color: "#B45309", marginBottom: 8 },
  error: { fontSize: 12, color: "#DC2626", marginBottom: 8 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 4 },
  meta: { fontSize: 12, color: "#6B7280", marginBottom: 2 },
  missing: { fontSize: 12, color: "#B45309", marginTop: 4, marginBottom: 4 },
  steps: { marginTop: 8, gap: 6 },
  step: { fontSize: 13, color: "#374151", lineHeight: 18 },
  tapHint: { fontSize: 11, color: "#9CA3AF", marginTop: 4, fontStyle: "italic" },
  cacheHint: { fontSize: 11, color: "#9CA3AF", textAlign: "right" },
});
