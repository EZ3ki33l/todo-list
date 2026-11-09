import { useMemo, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { RecipeCatalog } from "@/components/recipe-catalog";
import { RecipeForm, type RecipeFormValue } from "@/components/recipe-form";
import { RecipeSourceBadge } from "@/components/recipe-source-badge";
import { confirmPermanentDelete } from "@/lib/confirm-delete";
import { getRecipeStyles } from "@/lib/recipe-styles";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";
import { trpc } from "@/lib/trpc";

const PAGE_SIZE = 20;

type BookTab = "book" | "catalog";

function recipeSubtitle(recipe: {
  timeLabel: string | null;
  servings: number | null;
  _count: { ingredients: number; steps: number };
}) {
  const parts: string[] = [];
  if (recipe.timeLabel) parts.push(recipe.timeLabel);
  if (recipe.servings) parts.push(`${recipe.servings} part${recipe.servings > 1 ? "s" : ""}`);
  parts.push(
    `${recipe._count.ingredients} ingrédient${recipe._count.ingredients > 1 ? "s" : ""}`,
  );
  if (recipe._count.steps > 0) {
    parts.push(`${recipe._count.steps} étape${recipe._count.steps > 1 ? "s" : ""}`);
  }
  return parts.join(" · ");
}

export default function RecipesScreen() {
  const router = useRouter();
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const styles = useMemo(() => getRecipeStyles(palette), [palette]);
  const utils = trpc.useUtils();

  const [tab, setTab] = useState<BookTab>("book");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const query = trpc.recipes.list.useInfiniteQuery(
    { search: search.trim() || undefined, limit: PAGE_SIZE },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  );

  const createRecipe = trpc.recipes.create.useMutation({
    onSuccess: () => {
      setCreating(false);
      void utils.recipes.list.invalidate();
    },
  });

  const deleteRecipe = trpc.recipes.delete.useMutation({
    onSuccess: () => void utils.recipes.list.invalidate(),
  });

  const recipes = query.data?.pages.flatMap((p) => p.items) ?? [];

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDelete(recipeId: string, title: string) {
    if (!(await confirmPermanentDelete(title))) return;
    deleteRecipe.mutate({ recipeId });
  }

  function handleCreate(value: RecipeFormValue) {
    createRecipe.mutate({ ...value, source: "MANUAL" });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          tab === "book" ? (
            <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />
          ) : undefined
        }
      >
        <View style={styles.tabsRow}>
          <Pressable
            style={[styles.tab, tab === "book" && styles.tabActive]}
            onPress={() => setTab("book")}
          >
            <Text style={[styles.tabText, tab === "book" && styles.tabTextActive]}>
              Mon carnet
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === "catalog" && styles.tabActive]}
            onPress={() => setTab("catalog")}
          >
            <Text style={[styles.tabText, tab === "catalog" && styles.tabTextActive]}>
              Catalogue
            </Text>
          </Pressable>
        </View>

        {tab === "catalog" ? <RecipeCatalog /> : null}

        {tab === "book" ? (
          <>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.input}
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher un titre ou un ingrédient…"
                placeholderTextColor={palette.textSubtle}
                returnKeyType="search"
              />
              {!creating ? (
                <Pressable style={styles.primaryBtn} onPress={() => setCreating(true)}>
                  <Text style={styles.primaryBtnText}>+</Text>
                </Pressable>
              ) : null}
            </View>

            {creating ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: palette.borderSoft,
                  backgroundColor: palette.bgElevated,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Nouvelle recette</Text>
                <RecipeForm
                  submitLabel="Enregistrer"
                  pending={createRecipe.isPending}
                  error={createRecipe.error?.message ?? null}
                  onSubmit={handleCreate}
                  onCancel={() => setCreating(false)}
                />
              </View>
            ) : null}

            {query.isLoading ? (
              <Text style={styles.empty}>Chargement…</Text>
            ) : query.error ? (
              <Text style={styles.error}>{query.error.message}</Text>
            ) : recipes.length === 0 ? (
              <Text style={styles.empty}>
                {search.trim()
                  ? "Aucune recette ne correspond à cette recherche."
                  : "Votre carnet est vide. Créez une recette, importez-en une depuis le catalogue, ou enregistrez-en une depuis le Chef IA."}
              </Text>
            ) : (
              recipes.map((recipe) => (
                <View key={recipe.id} style={styles.card}>
                  <Pressable
                    style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
                    onPress={() => router.push(`/(app)/recettes/${recipe.id}`)}
                  >
                    {recipe.imageUrl ? (
                      <Image
                        source={{ uri: recipe.imageUrl }}
                        style={styles.cardThumb}
                        resizeMode="cover"
                      />
                    ) : null}
                    <View style={styles.cardMain}>
                      <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {recipe.title}
                        </Text>
                        <RecipeSourceBadge source={recipe.source} />
                      </View>
                      <Text style={styles.cardMeta}>{recipeSubtitle(recipe)}</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={styles.cardDelete}
                    onPress={() => void handleDelete(recipe.id, recipe.title)}
                    disabled={deleteRecipe.isPending}
                    accessibilityLabel={`Supprimer la recette ${recipe.title}`}
                  >
                    <Text style={styles.cardDeleteText}>🗑</Text>
                  </Pressable>
                </View>
              ))
            )}

            {query.hasNextPage ? (
              <Pressable
                style={[styles.secondaryBtn, { marginTop: 8 }]}
                onPress={() => void query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
              >
                <Text style={styles.secondaryBtnText}>
                  {query.isFetchingNextPage ? "Chargement…" : "Charger plus"}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
