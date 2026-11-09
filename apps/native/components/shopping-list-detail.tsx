import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  LazyDraggableFlatList,
  type RenderItemParams,
} from "@/lib/lazy-draggable-flatlist";
import { useNavigation } from "expo-router";

import { CategoryChips } from "@/components/category-chips";
import { FluentEmoji } from "@/components/fluent-emoji";
import { PushOptInCard } from "@/components/push-opt-in-card";
import { RecipeChefChat } from "@/components/recipe-chef-chat";
import { ShareShoppingListModal } from "@/components/share-shopping-list-modal";
import { ShoppingItemRow } from "@/components/shopping-item-row";
import { TitleSuggestionList } from "@/components/title-suggestion-list";
import { UnitPicker } from "@/components/unit-picker";
import { useAuth } from "@/lib/auth-context";
import {
  confirmPermanentBulkDelete,
  confirmPermanentDelete,
} from "@/lib/confirm-delete";
import {
  detectCategory,
  getTitleSuggestions,
  mergeItemMemory,
  normalizeItemTitle,
  type GroceryCategory,
  type ItemMemory,
  type SuggestionHistoryEntry,
  type TitleSuggestion,
} from "@repo/domain/grocery-detect";
import { CATEGORY_LABELS, itemIcon } from "@repo/domain/grocery-ui";
import { applyListOrder } from "@repo/domain/reorder-list";
import { parseQuantity } from "@repo/domain/shopping-quantity";
import { listAccess } from "@repo/domain/list-access";
import { trpc } from "@/lib/trpc";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";
import { getStyles } from "@/components/shopping-list-detail.styles";

/** Aligné sur `shoppingItems.getFrequent` (évite les `any` si les types tRPC ne sont pas à jour). */
type FrequentShoppingItem = {
  title: string;
  titleNorm: string;
  category: GroceryCategory;
  quantity: number | null;
  unit: string | null;
  useCount: number;
  lastUsedAt?: string | Date;
};

type ListCatalogItem = {
  title: string;
  titleNorm: string;
  category: GroceryCategory;
  useCount: number;
};

export function ShoppingListDetail({
  listId,
  embedded = false,
  footer,
}: {
  listId: string;
  embedded?: boolean;
  footer?: React.ReactNode;
}) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const styles = useMemo(() => getStyles(palette), [palette]);

  const [title, setTitle] = useState("");
  const [quantityText, setQuantityText] = useState("");
  const [unit, setUnit] = useState<string | null>(null);
  const [manualCategory, setManualCategory] = useState<GroceryCategory>("AUTRE");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editQuantityText, setEditQuantityText] = useState("");
  const [editUnit, setEditUnit] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<GroceryCategory>("AUTRE");
  const [editShowCategory, setEditShowCategory] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);
  const [listViewportHeight, setListViewportHeight] = useState(0);
  const [listContentHeight, setListContentHeight] = useState(0);

  const utils = trpc.useUtils();

  const { data: list } = trpc.shoppingLists.getById.useQuery(
    { listId: listId! },
    { enabled: !!listId },
  );

  const { data: items, isLoading } = trpc.shoppingItems.getByList.useQuery(
    { listId: listId! },
    { enabled: !!listId },
  );

  const { isOwner, canWrite, isShared } = listAccess(list, user?.id);

  const { data: frequentItemsRaw } = trpc.shoppingItems.getFrequent.useQuery(
    { limit: 24, minUseCount: 1 },
    { enabled: !!listId && canWrite, retry: false },
  );
  const frequentItems = frequentItemsRaw as FrequentShoppingItem[] | undefined;

  const { data: listCatalogRaw } = trpc.shoppingItems.getListCatalog.useQuery(
    { listId: listId!, limit: 32 },
    { enabled: !!listId && canWrite && isShared, retry: false },
  );
  const listCatalog = listCatalogRaw as ListCatalogItem[] | undefined;

  const userMemory: ItemMemory[] = useMemo(
    () =>
      (frequentItems ?? []).map((f) => ({
        titleNorm: f.titleNorm,
        category: f.category,
      })),
    [frequentItems],
  );

  const listMemory: ItemMemory[] = useMemo(
    () =>
      isShared
        ? (listCatalog ?? []).map((e) => ({
            titleNorm: e.titleNorm,
            category: e.category,
          }))
        : [],
    [isShared, listCatalog],
  );

  const itemMemory = useMemo(
    () => mergeItemMemory(userMemory, listMemory),
    [userMemory, listMemory],
  );

  const suggestionHistory: SuggestionHistoryEntry[] = useMemo(() => {
    const seen = new Set<string>();
    const out: SuggestionHistoryEntry[] = [];
    const push = (entry: SuggestionHistoryEntry) => {
      if (seen.has(entry.titleNorm)) return;
      seen.add(entry.titleNorm);
      out.push(entry);
    };
    for (const f of frequentItems ?? []) {
      push({
        title: f.title,
        titleNorm: f.titleNorm,
        category: f.category,
        source: "history",
      });
    }
    if (isShared) {
      for (const e of listCatalog ?? []) {
        push({
          title: e.title,
          titleNorm: e.titleNorm,
          category: e.category,
          source: "list",
        });
      }
    }
    return out;
  }, [frequentItems, listCatalog, isShared]);

  const detectedCategory = useMemo(
    () => detectCategory(title, itemMemory),
    [title, itemMemory],
  );
  const resolvedCategory = detectedCategory ?? manualCategory;
  const needsCategoryPicker = !detectedCategory && title.trim().length > 0;

  useEffect(() => {
    setShowCategoryPicker(needsCategoryPicker);
  }, [needsCategoryPicker]);

  useLayoutEffect(() => {
    if (embedded) return;
    navigation.setOptions({
      title: list?.title ?? "Courses",
      headerRight: isOwner
        ? () => (
            <Pressable onPress={() => setShareOpen(true)} hitSlop={8}>
              <Text style={styles.headerShare}>Partager</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [embedded, navigation, list?.title, isOwner]);

  const invalidateItems = () => {
    if (!listId) return;
    void utils.shoppingItems.getByList.invalidate({ listId });
  };

  const refreshAfterCreate = async () => {
    if (!listId) return;
    await Promise.all([
      utils.shoppingItems.getByList.invalidate({ listId }),
      utils.shoppingItems.getFrequent.invalidate(),
      utils.shoppingItems.getListCatalog.invalidate({ listId }),
    ]);
  };

  const createItem = trpc.shoppingItems.create.useMutation({
    onSuccess: async () => {
      await refreshAfterCreate();
      setTitle("");
      setQuantityText("");
      setUnit(null);
      setManualCategory("AUTRE");
      setShowCategoryPicker(false);
    },
  });

  const updateItem = trpc.shoppingItems.update.useMutation({
    onSuccess: async () => {
      await refreshAfterCreate();
      setEditingId(null);
    },
  });

  const toggleItem = trpc.shoppingItems.toggle.useMutation({
    onSuccess: (updated) => {
      if (!listId) return;
      utils.shoppingItems.getByList.setData({ listId }, (old) =>
        old?.map((item) => (item.id === updated.id ? { ...item, checked: updated.checked } : item)),
      );
    },
  });

  const deleteItem = trpc.shoppingItems.delete.useMutation({
    onSuccess: () => refreshAfterCreate(),
  });

  const clearChecked = trpc.shoppingItems.clearChecked.useMutation({
    onSuccess: () => invalidateItems(),
  });

  type ShoppingItemRecord = NonNullable<typeof items>[number];

  const handleDeleteItem = useCallback(
    async (item: ShoppingItemRecord) => {
      if (!(await confirmPermanentDelete(item.title))) return;
      deleteItem.mutate({ itemId: item.id });
    },
    [deleteItem],
  );

  const checkedItems = useMemo(
    () => (items ?? []).filter((i) => i.checked),
    [items],
  );
  const uncheckedItems = useMemo(
    () => (items ?? []).filter((i) => !i.checked),
    [items],
  );
  const [uncheckedOverride, setUncheckedOverride] = useState<ShoppingItemRecord[] | null>(
    null,
  );
  const uncheckedListData = uncheckedOverride ?? uncheckedItems;

  const uncheckedIdsKey = useMemo(
    () => uncheckedItems.map((i) => i.id).sort().join(","),
    [uncheckedItems],
  );
  useEffect(() => {
    setUncheckedOverride(null);
  }, [uncheckedIdsKey]);

  const checkedIdsRef = useRef<string[]>([]);
  checkedIdsRef.current = checkedItems.map((i) => i.id);

  const reorderItems = trpc.shoppingItems.reorder.useMutation({
    onSuccess: (_result, { listId: lid, orderedIds }) => {
      utils.shoppingItems.getByList.setData({ listId: lid }, (old) =>
        old ? applyListOrder(old, orderedIds) : old,
      );
      setUncheckedOverride(null);
    },
    onError: (_err, input) => {
      setUncheckedOverride(null);
      void utils.shoppingItems.getByList.invalidate({ listId: input.listId });
    },
  });

  function handleCreate(quick?: {
    title: string;
    category: GroceryCategory;
    quantity?: number | null;
    unit?: string | null;
  }) {
    if (!listId || !canWrite) return;
    const t = quick?.title ?? title.trim();
    if (!t) return;
    const cat = quick?.category ?? resolvedCategory;
    if (!quick && needsCategoryPicker && !manualCategory) return;
    createItem.mutate({
      listId,
      title: t,
      quantity: quick ? (quick.quantity ?? null) : parseQuantity(quantityText),
      unit: quick ? (quick.unit ?? null) : unit,
      category: cat,
    });
  }

  const titlesInList = useMemo(
    () => new Set((items ?? []).map((i) => normalizeItemTitle(i.title))),
    [items],
  );

  /** Puces « Ajout rapide » : au moins 2 ajouts, pas déjà dans la liste, tri récent. */
  const frequentNotInList = useMemo((): FrequentShoppingItem[] => {
    if (!frequentItems?.length) return [];
    return frequentItems
      .filter((f) => f.useCount >= 2 && !titlesInList.has(f.titleNorm))
      .sort((a, b) => {
        const ta = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
        const tb = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
        return tb - ta || b.useCount - a.useCount;
      });
  }, [frequentItems, titlesInList]);

  function filterSuggestions(raw: string): TitleSuggestion[] {
    if (!canWrite || raw.trim().length < 1) return [];
    const norm = normalizeItemTitle(raw);
    return getTitleSuggestions(raw, suggestionHistory).filter(
      (s) => normalizeItemTitle(s.title) !== norm,
    );
  }

  const titleSuggestions = useMemo(
    () => filterSuggestions(title),
    [canWrite, title, suggestionHistory],
  );

  const editTitleSuggestions = useMemo(
    () => (editingId ? filterSuggestions(editTitle) : []),
    [editingId, editTitle, canWrite, suggestionHistory],
  );

  function applyTitleSuggestion(s: TitleSuggestion) {
    setTitle(s.title);
    const detected = detectCategory(s.title, itemMemory);
    if (detected) {
      setManualCategory(detected);
      setShowCategoryPicker(false);
    } else {
      setManualCategory(s.category);
      setShowCategoryPicker(true);
    }
  }

  function applyEditTitleSuggestion(s: TitleSuggestion) {
    setEditTitle(s.title);
    const detected = detectCategory(s.title, itemMemory);
    if (detected) {
      setEditCategory(detected);
      setEditShowCategory(false);
    } else {
      setEditCategory(s.category);
      setEditShowCategory(true);
    }
  }

  function startEdit(item: NonNullable<typeof items>[number]) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditQuantityText(item.quantity != null ? String(item.quantity) : "");
    setEditUnit(item.unit ?? null);
    setEditCategory(item.category as GroceryCategory);
    setEditShowCategory(false);
  }

  function handleSaveEdit(itemId: string) {
    if (!editTitle.trim()) return;
    const cat = detectCategory(editTitle, itemMemory) ?? editCategory;
    updateItem.mutate({
      itemId,
      title: editTitle.trim(),
      quantity: parseQuantity(editQuantityText),
      unit: editUnit,
      category: cat,
    });
  }

  const checkedCount = checkedItems.length;
  const hasChecked = checkedCount > 0;
  const dragEnabled = canWrite && !editingId;

  const handleUncheckedDragEnd = useCallback(
    ({ data }: { data: ShoppingItemRecord[] }) => {
      if (!listId) return;
      setUncheckedOverride(data);
      const orderedIds = [...data.map((i) => i.id), ...checkedIdsRef.current];
      reorderItems.mutate({ listId, orderedIds });
    },
    [listId, reorderItems],
  );

  const editState = {
    title: editTitle,
    quantityText: editQuantityText,
    unit: editUnit,
    category: editCategory,
    showCategory: editShowCategory,
  };

  const renderShoppingItem = useCallback(
    (
      item: ShoppingItemRecord,
      opts?: { drag?: () => void; isActive?: boolean; draggable?: boolean },
    ) => (
      <ShoppingItemRow
        key={item.id}
        item={item}
        canWrite={canWrite}
        draggable={opts?.draggable}
        drag={opts?.drag}
        isActive={opts?.isActive}
        isEditing={editingId === item.id}
        edit={editState}
        itemMemory={itemMemory}
        editSuggestions={editTitleSuggestions}
        onToggle={() => toggleItem.mutate({ itemId: item.id })}
        onDelete={() => void handleDeleteItem(item)}
        onStartEdit={() => startEdit(item)}
        onEditTitleChange={setEditTitle}
        onEditQuantityChange={setEditQuantityText}
        onEditUnitChange={setEditUnit}
        onEditCategoryChange={setEditCategory}
        onEditShowCategory={setEditShowCategory}
        onApplyEditSuggestion={applyEditTitleSuggestion}
        onSaveEdit={() => handleSaveEdit(item.id)}
        onCancelEdit={() => setEditingId(null)}
      />
    ),
    [canWrite, editingId, editState, itemMemory, editTitleSuggestions, toggleItem, handleDeleteItem],
  );

  const renderDraggableItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<ShoppingItemRecord>) =>
      renderShoppingItem(item, { drag, isActive, draggable: dragEnabled }),
    [renderShoppingItem, dragEnabled],
  );

  const fabClearance = canWrite && listId ? 72 : 16;
  const listScrollEnabled = listContentHeight > listViewportHeight + 2;

  const listHeader = (
    <>
        {embedded && (isOwner || (!!list && isShared)) ? (
          <View style={styles.embeddedTopRow}>
            {isOwner ? (
              <Pressable onPress={() => setShareOpen(true)}>
                <Text style={styles.headerShare}>Partager la liste</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <PushOptInCard visible={!!list && isShared} embedded />
          </View>
        ) : (
          <PushOptInCard visible={!!list && isShared} />
        )}

        {!canWrite && (
          <Text style={styles.readOnlyBanner}>
            Lecture seule — demandez l'accès écriture au propriétaire
          </Text>
        )}

        {canWrite && frequentNotInList.length > 0 && (
          <View style={styles.frequentSection}>
            <Text style={styles.frequentTitle}>Ajout rapide</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.frequentRow}>
                {frequentNotInList.map((f: FrequentShoppingItem) => (
                  <Pressable
                    key={f.titleNorm}
                    style={styles.frequentChip}
                    onPress={() =>
                      handleCreate({
                        title: f.title,
                        category: f.category,
                        quantity: f.quantity,
                        unit: f.unit,
                      })
                    }
                    disabled={createItem.isPending}
                  >
                    <FluentEmoji emoji={itemIcon(f.category, null, f.title)} size={16} />
                    <Text style={styles.frequentLabel} numberOfLines={1}>
                      {f.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {canWrite && (
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              placeholder="Article (ex. tomates, lait...)"
              placeholderTextColor={palette.textSubtle}
              value={title}
              onChangeText={setTitle}
              returnKeyType="done"
              autoCorrect={false}
              autoCapitalize="sentences"
            />
            <TitleSuggestionList
              suggestions={titleSuggestions}
              onSelect={applyTitleSuggestion}
            />
            <TextInput
              style={styles.input}
              placeholder="Qté (ex. 2, 0.5…)"
              placeholderTextColor={palette.textSubtle}
              value={quantityText}
              onChangeText={setQuantityText}
              keyboardType="decimal-pad"
            />
            <UnitPicker value={unit} onChange={setUnit} />

            {detectedCategory && title.trim() ? (
              <Text style={styles.detectedHint}>
                Catégorie : {CATEGORY_LABELS[detectedCategory]}
              </Text>
            ) : null}

            {(showCategoryPicker || needsCategoryPicker) && title.trim() ? (
              <View style={styles.pickerBlock}>
                <Text style={styles.pickerLabel}>Choisir une catégorie</Text>
                <CategoryChips value={manualCategory} onChange={setManualCategory} />
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.addBtn,
                pressed && { opacity: 0.8 },
                (!title.trim() || createItem.isPending) && { opacity: 0.4 },
              ]}
              onPress={() => handleCreate()}
              disabled={!title.trim() || createItem.isPending}
            >
              <Text style={styles.addBtnText}>Ajouter</Text>
            </Pressable>
          </View>
        )}

        {hasChecked && canWrite && (
          <Pressable
            style={styles.clearBtn}
            onPress={() => {
              void (async () => {
                const label =
                  checkedCount === 1
                    ? "l'article coché"
                    : `les ${checkedCount} articles cochés`;
                if (!(await confirmPermanentBulkDelete(label))) return;
                clearChecked.mutate({ listId: listId! });
              })();
            }}
            disabled={clearChecked.isPending}
          >
            <Text style={styles.clearBtnText}>
              Vider les articles cochés ({checkedCount})
            </Text>
          </Pressable>
        )}

        {uncheckedItems.length > 1 && canWrite && (
          <Text style={styles.dragHint}>Maintenir un article pour réordonner</Text>
        )}
    </>
  );

  return (
    <>
      <LazyDraggableFlatList
        data={uncheckedListData}
        keyExtractor={(item: ShoppingItemRecord) => item.id}
        onDragEnd={handleUncheckedDragEnd}
        activationDistance={12}
        enableLayoutAnimationExperimental={false}
        renderItem={renderDraggableItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          <>
            {checkedItems.map((item: ShoppingItemRecord) => renderShoppingItem(item))}
            {!isLoading && (items?.length ?? 0) === 0 && (
              <Text style={styles.empty}>Aucun article dans cette liste.</Text>
            )}
            {footer}
          </>
        }
        containerStyle={styles.container}
        contentContainerStyle={[
          embedded ? styles.contentEmbedded : styles.content,
          { paddingBottom: fabClearance },
        ]}
        onLayout={(event: LayoutChangeEvent) => setListViewportHeight(event.nativeEvent.layout.height)}
        onContentSizeChange={(_w: number, height: number) => setListContentHeight(height)}
        scrollEnabled={listScrollEnabled}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={listScrollEnabled}
      />

      {canWrite && listId ? <RecipeChefChat listId={listId} /> : null}

      <ShareShoppingListModal listId={listId} visible={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  );
}

