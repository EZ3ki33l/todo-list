import { useMemo } from "react";
import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import type { GroceryCategory } from "@repo/domain/grocery-detect";
import { itemIcon } from "@repo/domain/grocery-ui";
import { FluentEmoji } from "@/components/fluent-emoji";
import { getRecipeStyles } from "@/lib/recipe-styles";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";
import { trpc } from "@/lib/trpc";

export default function CatalogMealScreen() {
  const { mealId } = useLocalSearchParams<{ mealId: string }>();
  const router = useRouter();
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const styles = useMemo(() => getRecipeStyles(palette), [palette]);
  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.recipes.catalogGet.useQuery(
    { mealId: mealId! },
    { enabled: !!mealId },
  );

  const importMeal = trpc.recipes.importFromCatalog.useMutation({
    onSuccess: (result) => {
      void utils.recipes.list.invalidate();
      void utils.recipes.catalogGet.invalidate({ mealId: mealId! });
      router.replace(`/(app)/recettes/${result.recipe.id}`);
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { padding: 16 }]}>
        <Text style={styles.empty}>Chargement…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.container, { padding: 16 }]}>
        <Text style={styles.error}>
          {error?.message ?? "Recette introuvable dans le catalogue."}
        </Text>
      </View>
    );
  }

  const { meal, savedRecipeId } = data;
  const meta = [
    meal.areaLabel ? `Cuisine ${meal.areaLabel.toLowerCase()}` : null,
    meal.categoryLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <Image source={{ uri: meal.thumbUrl }} style={styles.heroImage} resizeMode="cover" />

      <View style={{ padding: 16 }}>
        <Text style={styles.detailTitle}>{meal.title}</Text>
        {meta ? <Text style={styles.detailMeta}>{meta}</Text> : null}
        {meal.tags.length > 0 ? (
          <Text style={[styles.detailMeta, { marginTop: 4 }]}>{meal.tags.join(" · ")}</Text>
        ) : null}

        <View style={styles.sectionTitleRow}>
          <FluentEmoji emoji="🥗" size={16} />
          <Text style={styles.sectionTitle}>Ingrédients</Text>
        </View>
        {meal.ingredients.length === 0 ? (
          <Text style={styles.empty}>Aucun ingrédient.</Text>
        ) : (
          meal.ingredients.map((ingredient, idx) => (
            <View key={`${ingredient.title}-${idx}`} style={styles.ingredientRow}>
              <FluentEmoji
                emoji={itemIcon(ingredient.category as GroceryCategory, null, ingredient.title)}
                size={18}
              />
              <Text style={styles.ingredientTitle}>{ingredient.title}</Text>
              {ingredient.quantity !== null || ingredient.unit ? (
                <Text style={styles.ingredientQty}>
                  {ingredient.quantity ?? ""}
                  {ingredient.unit ? ` ${ingredient.unit}` : ""}
                </Text>
              ) : null}
            </View>
          ))
        )}

        <View style={styles.sectionTitleRow}>
          <FluentEmoji emoji="👨‍🍳" size={16} />
          <Text style={styles.sectionTitle}>Étapes</Text>
        </View>
        {meal.steps.length === 0 ? (
          <Text style={styles.empty}>Aucune étape.</Text>
        ) : (
          meal.steps.map((step, idx) => (
            <View key={idx} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{idx + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))
        )}

        {importMeal.error ? <Text style={styles.error}>{importMeal.error.message}</Text> : null}

        <View style={styles.actionsRow}>
          {savedRecipeId ? (
            <Pressable
              style={styles.primaryBtn}
              onPress={() => router.replace(`/(app)/recettes/${savedRecipeId}`)}
            >
              <Text style={styles.primaryBtnText}>Voir dans mon carnet</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.primaryBtn, importMeal.isPending && { opacity: 0.4 }]}
              onPress={() => importMeal.mutate({ mealId: meal.id })}
              disabled={importMeal.isPending}
            >
              <Text style={styles.primaryBtnText}>
                {importMeal.isPending ? "Ajout…" : "Ajouter à mon carnet"}
              </Text>
            </Pressable>
          )}
          {meal.youtubeUrl ? (
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => void Linking.openURL(meal.youtubeUrl!)}
            >
              <Text style={styles.secondaryBtnText}>Vidéo</Text>
            </Pressable>
          ) : null}
          {meal.sourceUrl ? (
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => void Linking.openURL(meal.sourceUrl!)}
            >
              <Text style={styles.secondaryBtnText}>Source</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}
