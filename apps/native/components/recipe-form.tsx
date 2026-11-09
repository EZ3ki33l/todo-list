import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { detectCategory, type GroceryCategory } from "@repo/domain/grocery-detect";
import { CATEGORY_LABELS, itemIcon } from "@repo/domain/grocery-ui";
import { parseQuantity } from "@repo/domain/shopping-quantity";
import { CategoryChips } from "@/components/category-chips";
import { FluentEmoji } from "@/components/fluent-emoji";
import { getRecipeStyles } from "@/lib/recipe-styles";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

export type RecipeFormIngredient = {
  title: string;
  quantity: number | null;
  unit: string | null;
  category: GroceryCategory;
};

export type RecipeFormValue = {
  title: string;
  timeLabel: string | null;
  servings: number | null;
  notes: string | null;
  ingredients: RecipeFormIngredient[];
  steps: string[];
};

const EMPTY: RecipeFormValue = {
  title: "",
  timeLabel: null,
  servings: null,
  notes: null,
  ingredients: [],
  steps: [],
};

export function RecipeForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: RecipeFormValue;
  submitLabel: string;
  pending: boolean;
  error?: string | null;
  onSubmit: (value: RecipeFormValue) => void;
  onCancel?: () => void;
}) {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const styles = useMemo(() => getRecipeStyles(palette), [palette]);

  const [value, setValue] = useState<RecipeFormValue>(initial ?? EMPTY);
  const [ingredientDraft, setIngredientDraft] = useState("");
  const [quantityDraft, setQuantityDraft] = useState("");
  const [unitDraft, setUnitDraft] = useState("");
  const [stepDraft, setStepDraft] = useState("");
  /** Index de l'ingrédient dont on ajuste la catégorie, `null` si aucun. */
  const [categoryFor, setCategoryFor] = useState<number | null>(null);

  function patch(next: Partial<RecipeFormValue>) {
    setValue((v) => ({ ...v, ...next }));
  }

  function addIngredient() {
    const title = ingredientDraft.trim();
    if (!title) return;
    patch({
      ingredients: [
        ...value.ingredients,
        {
          title,
          quantity: parseQuantity(quantityDraft),
          unit: unitDraft.trim() || null,
          category: detectCategory(title) ?? "AUTRE",
        },
      ],
    });
    setIngredientDraft("");
    setQuantityDraft("");
    setUnitDraft("");
  }

  function addStep() {
    const text = stepDraft.trim();
    if (!text) return;
    patch({ steps: [...value.steps, text] });
    setStepDraft("");
  }

  function moveStep(index: number, delta: number) {
    const next = [...value.steps];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    patch({ steps: next });
  }

  const canSubmit = value.title.trim().length > 0 && !pending;

  return (
    <View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Titre</Text>
        <TextInput
          style={styles.input}
          value={value.title}
          onChangeText={(t) => patch({ title: t })}
          placeholder="Ex. Gratin de courgettes"
          placeholderTextColor={palette.textSubtle}
        />
      </View>

      <View style={[styles.fieldRow, styles.field]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Temps</Text>
          <TextInput
            style={styles.input}
            value={value.timeLabel ?? ""}
            onChangeText={(t) => patch({ timeLabel: t || null })}
            placeholder="45 min"
            placeholderTextColor={palette.textSubtle}
          />
        </View>
        <View style={{ width: 110 }}>
          <Text style={styles.fieldLabel}>Parts</Text>
          <TextInput
            style={styles.input}
            value={value.servings != null ? String(value.servings) : ""}
            onChangeText={(t) => {
              const n = parseInt(t.replace(/\D/g, ""), 10);
              patch({ servings: Number.isFinite(n) && n > 0 ? Math.min(n, 100) : null });
            }}
            keyboardType="number-pad"
            placeholder="4"
            placeholderTextColor={palette.textSubtle}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Notes (facultatif)</Text>
        <TextInput
          style={[styles.input, { minHeight: 64, textAlignVertical: "top" }]}
          value={value.notes ?? ""}
          onChangeText={(t) => patch({ notes: t || null })}
          multiline
          placeholder="Un grand classique…"
          placeholderTextColor={palette.textSubtle}
        />
      </View>

      <View style={styles.sectionTitleRow}>
        <FluentEmoji emoji="🥗" size={16} />
        <Text style={styles.sectionTitle}>Ingrédients</Text>
      </View>

      {value.ingredients.length === 0 ? (
        <Text style={styles.empty}>Aucun ingrédient pour l'instant.</Text>
      ) : (
        value.ingredients.map((ingredient, idx) => (
          <View key={idx}>
            <View style={styles.ingredientRow}>
              <FluentEmoji
                emoji={itemIcon(ingredient.category, null, ingredient.title)}
                size={18}
              />
              <Text style={styles.ingredientTitle} numberOfLines={1}>
                {ingredient.title}
              </Text>
              {ingredient.quantity !== null ? (
                <Text style={styles.ingredientQty}>
                  {ingredient.quantity}
                  {ingredient.unit ? ` ${ingredient.unit}` : ""}
                </Text>
              ) : null}
              <Pressable
                onPress={() => setCategoryFor(categoryFor === idx ? null : idx)}
                hitSlop={6}
                accessibilityLabel={`Catégorie de ${ingredient.title}`}
              >
                <Text style={styles.ingredientQty}>{CATEGORY_LABELS[ingredient.category]}</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  patch({ ingredients: value.ingredients.filter((_, i) => i !== idx) })
                }
                hitSlop={6}
                style={styles.chipRemove}
                accessibilityLabel={`Retirer ${ingredient.title}`}
              >
                <Text style={styles.chipRemoveText}>×</Text>
              </Pressable>
            </View>
            {categoryFor === idx ? (
              <CategoryChips
                value={ingredient.category}
                onChange={(category) => {
                  const next = [...value.ingredients];
                  next[idx] = { ...ingredient, category };
                  patch({ ingredients: next });
                  setCategoryFor(null);
                }}
              />
            ) : null}
          </View>
        ))
      )}

      <View style={[styles.searchRow, { marginTop: 8 }]}>
        <TextInput
          style={styles.input}
          value={ingredientDraft}
          onChangeText={setIngredientDraft}
          placeholder="Courgettes"
          placeholderTextColor={palette.textSubtle}
          returnKeyType="done"
          onSubmitEditing={addIngredient}
        />
        <TextInput
          style={[styles.input, { flex: 0, width: 70 }]}
          value={quantityDraft}
          onChangeText={setQuantityDraft}
          placeholder="600"
          placeholderTextColor={palette.textSubtle}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={[styles.input, { flex: 0, width: 60 }]}
          value={unitDraft}
          onChangeText={setUnitDraft}
          placeholder="g"
          placeholderTextColor={palette.textSubtle}
        />
        <Pressable
          style={[styles.secondaryBtn, !ingredientDraft.trim() && { opacity: 0.4 }]}
          onPress={addIngredient}
          disabled={!ingredientDraft.trim()}
        >
          <Text style={styles.secondaryBtnText}>+</Text>
        </Pressable>
      </View>

      <View style={styles.sectionTitleRow}>
        <FluentEmoji emoji="👨‍🍳" size={16} />
        <Text style={styles.sectionTitle}>Étapes</Text>
      </View>

      {value.steps.length === 0 ? (
        <Text style={styles.empty}>Aucune étape pour l'instant.</Text>
      ) : (
        value.steps.map((step, idx) => (
          <View key={idx} style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{idx + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
            <Pressable
              onPress={() => moveStep(idx, -1)}
              disabled={idx === 0}
              hitSlop={6}
              accessibilityLabel={`Monter l'étape ${idx + 1}`}
            >
              <Text style={[styles.ingredientQty, idx === 0 && { opacity: 0.3 }]}>↑</Text>
            </Pressable>
            <Pressable
              onPress={() => moveStep(idx, 1)}
              disabled={idx === value.steps.length - 1}
              hitSlop={6}
              accessibilityLabel={`Descendre l'étape ${idx + 1}`}
            >
              <Text
                style={[
                  styles.ingredientQty,
                  idx === value.steps.length - 1 && { opacity: 0.3 },
                ]}
              >
                ↓
              </Text>
            </Pressable>
            <Pressable
              onPress={() => patch({ steps: value.steps.filter((_, i) => i !== idx) })}
              hitSlop={6}
              style={styles.chipRemove}
              accessibilityLabel={`Retirer l'étape ${idx + 1}`}
            >
              <Text style={styles.chipRemoveText}>×</Text>
            </Pressable>
          </View>
        ))
      )}

      <View style={[styles.searchRow, { marginTop: 8 }]}>
        <TextInput
          style={styles.input}
          value={stepDraft}
          onChangeText={setStepDraft}
          placeholder="Émincer les courgettes"
          placeholderTextColor={palette.textSubtle}
          returnKeyType="done"
          onSubmitEditing={addStep}
        />
        <Pressable
          style={[styles.secondaryBtn, !stepDraft.trim() && { opacity: 0.4 }]}
          onPress={addStep}
          disabled={!stepDraft.trim()}
        >
          <Text style={styles.secondaryBtnText}>+</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.primaryBtn, !canSubmit && { opacity: 0.4 }]}
          onPress={() => onSubmit({ ...value, title: value.title.trim() })}
          disabled={!canSubmit}
        >
          <Text style={styles.primaryBtnText}>
            {pending ? "Enregistrement…" : submitLabel}
          </Text>
        </Pressable>
        {onCancel ? (
          <Pressable style={styles.secondaryBtn} onPress={onCancel}>
            <Text style={styles.secondaryBtnText}>Annuler</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Variante autonome scrollable, pour l'écran de création. */
export function RecipeFormScreen(props: Parameters<typeof RecipeForm>[0]) {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const styles = useMemo(() => getRecipeStyles(palette), [palette]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <RecipeForm {...props} />
    </ScrollView>
  );
}
