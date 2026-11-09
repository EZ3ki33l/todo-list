import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { FluentEmoji } from "@/components/fluent-emoji";
import { getRecipeStyles } from "@/lib/recipe-styles";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";
import { trpc } from "@/lib/trpc";

const SEARCH_DEBOUNCE_MS = 350;

/** Filtre horizontal : « Toutes » plus les options renvoyées par l'API. */
function FilterRow({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
}) {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const styles = useMemo(() => getRecipeStyles(palette), [palette]);

  if (options.length === 0) return null;

  return (
    <View style={{ marginBottom: 10, opacity: disabled ? 0.4 : 1 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 6, paddingRight: 8 }}>
          {[{ value: "", label: "Toutes" }, ...options].map((opt) => {
            const active = value === opt.value;
            return (
              <Pressable
                key={opt.value || "_all"}
                onPress={() => !disabled && onChange(active ? "" : opt.value)}
                disabled={disabled}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: active ? palette.primary : palette.border,
                  backgroundColor: active ? palette.primary : palette.bgElevated,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: active ? palette.onPrimary : palette.textMuted,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export function RecipeCatalog() {
  const router = useRouter();
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const styles = useMemo(() => getRecipeStyles(palette), [palette]);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("");
  const [area, setArea] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = trpc.recipes.catalogFilters.useQuery();
  const query = trpc.recipes.catalogSearch.useQuery({
    query: debounced || undefined,
    category: debounced ? undefined : category || undefined,
    area: debounced ? undefined : area || undefined,
  });
  const randomMeal = trpc.recipes.catalogRandom.useMutation({
    onSuccess: (data) => router.push(`/(app)/recettes/catalogue/${data.meal.id}`),
  });

  const meals = query.data?.items ?? [];
  const searching = Boolean(debounced);

  return (
    <View>
      <Text style={styles.hint}>
        Catalogue TheMealDB. La recherche comprend le français (poulet, pâtes, soupe…) ;
        les titres restent ceux de la base, souvent en anglais.
      </Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un plat…"
          placeholderTextColor={palette.textSubtle}
          returnKeyType="search"
        />
        <Pressable
          style={[styles.secondaryBtn, randomMeal.isPending && { opacity: 0.4 }]}
          onPress={() => randomMeal.mutate()}
          disabled={randomMeal.isPending}
        >
          <Text style={styles.secondaryBtnText}>
            {randomMeal.isPending ? "…" : "Au hasard"}
          </Text>
        </Pressable>
      </View>

      <FilterRow
        label="Catégorie"
        options={filters.data?.categories ?? []}
        value={category}
        onChange={(next) => {
          setCategory(next);
          if (next) setSearch("");
        }}
        disabled={searching}
      />
      <FilterRow
        label="Cuisine"
        options={filters.data?.areas ?? []}
        value={area}
        onChange={(next) => {
          setArea(next);
          if (next) setSearch("");
        }}
        disabled={searching}
      />

      {randomMeal.error ? <Text style={styles.error}>{randomMeal.error.message}</Text> : null}

      {query.isLoading ? (
        <Text style={styles.empty}>Chargement du catalogue…</Text>
      ) : query.error ? (
        <Text style={styles.error}>{query.error.message}</Text>
      ) : meals.length === 0 ? (
        <Text style={styles.empty}>Aucune recette ne correspond à cette recherche.</Text>
      ) : (
        meals.map((meal) => (
          <Pressable
            key={meal.id}
            style={styles.card}
            onPress={() => router.push(`/(app)/recettes/catalogue/${meal.id}`)}
          >
            <Image source={{ uri: meal.thumbUrl }} style={styles.cardThumb} resizeMode="cover" />
            <View style={styles.cardMain}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {meal.title}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                <FluentEmoji emoji="🍽️" size={12} />
                <Text style={styles.cardMeta}>
                  {[meal.areaLabel, meal.categoryLabel].filter(Boolean).join(" · ") ||
                    "TheMealDB"}
                </Text>
              </View>
            </View>
          </Pressable>
        ))
      )}
    </View>
  );
}
