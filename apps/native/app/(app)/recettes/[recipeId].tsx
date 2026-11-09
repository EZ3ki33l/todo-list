import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import type { GroceryCategory } from "@repo/domain/grocery-detect";
import { itemIcon } from "@repo/domain/grocery-ui";
import { FluentEmoji } from "@/components/fluent-emoji";
import { RecipeForm, type RecipeFormValue } from "@/components/recipe-form";
import { RecipeSourceBadge } from "@/components/recipe-source-badge";
import { confirmPermanentDelete } from "@/lib/confirm-delete";
import { getRecipeStyles } from "@/lib/recipe-styles";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";
import { trpc } from "@/lib/trpc";

export default function RecipeDetailScreen() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const router = useRouter();
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const styles = useMemo(() => getRecipeStyles(palette), [palette]);
  const utils = trpc.useUtils();

  const [editing, setEditing] = useState(false);

  const {
    data: recipe,
    isLoading,
    error,
  } = trpc.recipes.getById.useQuery({ recipeId: recipeId! }, { enabled: !!recipeId });

  const updateRecipe = trpc.recipes.update.useMutation({
    onSuccess: () => {
      setEditing(false);
      void utils.recipes.getById.invalidate({ recipeId: recipeId! });
      void utils.recipes.list.invalidate();
    },
  });

  const deleteRecipe = trpc.recipes.delete.useMutation({
    onSuccess: () => {
      void utils.recipes.list.invalidate();
      router.back();
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { padding: 16 }]}>
        <Text style={styles.empty}>Chargement…</Text>
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={[styles.container, { padding: 16 }]}>
        <Text style={styles.error}>{error?.message ?? "Recette introuvable."}</Text>
      </View>
    );
  }

  if (editing) {
    const initial: RecipeFormValue = {
      title: recipe.title,
      timeLabel: recipe.timeLabel,
      servings: recipe.servings,
      notes: recipe.notes,
      ingredients: recipe.ingredients.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        unit: i.unit,
        category: i.category as GroceryCategory,
      })),
      steps: recipe.steps.map((s) => s.text),
    };

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <RecipeForm
          initial={initial}
          submitLabel="Enregistrer"
          pending={updateRecipe.isPending}
          error={updateRecipe.error?.message ?? null}
          onSubmit={(value) => updateRecipe.mutate({ ...value, recipeId: recipeId! })}
          onCancel={() => setEditing(false)}
        />
      </ScrollView>
    );
  }

  const meta =
    [recipe.timeLabel, recipe.servings ? `${recipe.servings} parts` : null]
      .filter(Boolean)
      .join(" · ") || "Pas de durée renseignée";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      {recipe.imageUrl ? (
        <Image source={{ uri: recipe.imageUrl }} style={styles.heroImage} resizeMode="cover" />
      ) : null}

      <View style={{ padding: 16 }}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.detailTitle}>{recipe.title}</Text>
          <RecipeSourceBadge source={recipe.source} />
        </View>
        <Text style={styles.detailMeta}>{meta}</Text>
        {recipe.notes ? <Text style={styles.detailNotes}>{recipe.notes}</Text> : null}

        <View style={styles.sectionTitleRow}>
          <FluentEmoji emoji="🥗" size={16} />
          <Text style={styles.sectionTitle}>Ingrédients</Text>
        </View>
        {recipe.ingredients.length === 0 ? (
          <Text style={styles.empty}>Aucun ingrédient.</Text>
        ) : (
          recipe.ingredients.map((ingredient) => (
            <View key={ingredient.id} style={styles.ingredientRow}>
              <FluentEmoji
                emoji={itemIcon(ingredient.category as GroceryCategory, null, ingredient.title)}
                size={18}
              />
              <Text style={styles.ingredientTitle}>{ingredient.title}</Text>
              {ingredient.quantity !== null ? (
                <Text style={styles.ingredientQty}>
                  {ingredient.quantity}
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
        {recipe.steps.length === 0 ? (
          <Text style={styles.empty}>Aucune étape.</Text>
        ) : (
          recipe.steps.map((step, idx) => (
            <View key={step.id} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{idx + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))
        )}

        <View style={styles.actionsRow}>
          <Pressable style={styles.secondaryBtn} onPress={() => setEditing(true)}>
            <Text style={styles.secondaryBtnText}>Modifier</Text>
          </Pressable>
          <Pressable
            style={[styles.dangerBtn, deleteRecipe.isPending && { opacity: 0.4 }]}
            onPress={async () => {
              if (await confirmPermanentDelete(recipe.title)) {
                deleteRecipe.mutate({ recipeId: recipeId! });
              }
            }}
            disabled={deleteRecipe.isPending}
          >
            <Text style={styles.dangerBtnText}>Supprimer</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
