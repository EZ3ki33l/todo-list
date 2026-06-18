import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  LazyDraggableFlatList,
  type RenderItemParams,
} from "@/lib/lazy-draggable-flatlist";
import { useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FluentEmoji } from "@/components/fluent-emoji";
import { PushOptInCard } from "@/components/push-opt-in-card";
import { RecipeChefChat } from "@/components/recipe-chef-chat";
import { TitleSuggestionList } from "@/components/title-suggestion-list";
import { UnitPicker } from "@/components/unit-picker";
import { useAuth } from "@/lib/auth-context";
import {
  detectCategory,
  getTitleSuggestions,
  mergeItemMemory,
  normalizeItemTitle,
  type GroceryCategory,
  type ItemMemory,
  type SuggestionHistoryEntry,
  type TitleSuggestion,
} from "@/lib/grocery-detect";
import {
  CATEGORY_LABELS,
  itemIcon,
  PICKABLE_CATEGORIES,
} from "@/lib/grocery-ui";
import { applyListOrder } from "@/lib/reorder-list";
import {
  memberRoleLabel,
  SHARE_ROLES,
  shareRoleLabel,
  toggleShareRole,
  type ShareRole,
} from "@/lib/share-roles";
import { trpc } from "@/lib/trpc";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

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

function CategoryChips({
  value,
  onChange,
  styles,
}: {
  value: GroceryCategory;
  onChange: (c: GroceryCategory) => void;
  styles: ReturnType<typeof getStyles>;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
      <View style={styles.chipsRow}>
        {PICKABLE_CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.chip, value === cat && styles.chipActive]}
            onPress={() => onChange(cat)}
          >
            <Text style={[styles.chipText, value === cat && styles.chipTextActive]}>
              {CATEGORY_LABELS[cat]}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

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
  const insets = useSafeAreaInsets();
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
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<ShareRole>("membre");
  const [shareError, setShareError] = useState<string | null>(null);
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

  const isOwner = list?.ownerId === user?.id;
  const myMember = list?.members.find((m) => m.userId === user?.id);
  const canWrite = isOwner || myMember?.role === "membre";

  const { data: frequentItemsRaw } = trpc.shoppingItems.getFrequent.useQuery(
    { limit: 24, minUseCount: 1 },
    { enabled: !!listId && canWrite, retry: false },
  );
  const frequentItems = frequentItemsRaw as FrequentShoppingItem[] | undefined;

  const isShared =
    (list?.members.length ?? 0) > 0 || (!!user?.id && !isOwner && !!myMember);

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
            <Pressable onPress={() => { setShareError(null); setShareOpen(true); }} hitSlop={8}>
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

  type ShoppingItemRow = NonNullable<typeof items>[number];
  const checkedItems = useMemo(
    () => (items ?? []).filter((i) => i.checked),
    [items],
  );
  const uncheckedItems = useMemo(
    () => (items ?? []).filter((i) => !i.checked),
    [items],
  );
  const [uncheckedOverride, setUncheckedOverride] = useState<ShoppingItemRow[] | null>(
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

  const shareList = trpc.shoppingLists.share.useMutation({
    onSuccess: () => {
      void utils.shoppingLists.getById.invalidate({ listId: listId! });
      void utils.shoppingLists.getAll.invalidate();
      setShareEmail("");
      setShareError(null);
      Alert.alert(
        "Liste partagée",
        "La personne la verra dans l'onglet Courses (pas d'écran « Accepter »). Si elle a activé les notifications, elle recevra une alerte.",
      );
    },
    onError: (err) => setShareError(err.message),
  });

  const unshare = trpc.shoppingLists.unshare.useMutation({
    onSuccess: () => utils.shoppingLists.getById.invalidate({ listId: listId! }),
  });

  function parseQuantity(text: string): number | null {
    const t = text.trim().replace(",", ".");
    if (!t) return null;
    const n = parseFloat(t);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

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
    ({ data }: { data: ShoppingItemRow[] }) => {
      if (!listId) return;
      setUncheckedOverride(data);
      const orderedIds = [...data.map((i) => i.id), ...checkedIdsRef.current];
      reorderItems.mutate({ listId, orderedIds });
    },
    [listId, reorderItems],
  );

  const renderShoppingItem = useCallback(
    (
      item: ShoppingItemRow,
      opts?: { drag?: () => void; isActive?: boolean; draggable?: boolean },
    ) => {
      const category = item.category as GroceryCategory;
      const icon = itemIcon(category, item.icon, item.title);
      const { drag, isActive, draggable } = opts ?? {};

      if (editingId === item.id) {
        const editDetected = detectCategory(editTitle, itemMemory);
        return (
          <View key={item.id} style={styles.itemCard}>
            <TextInput
              style={styles.input}
              value={editTitle}
              onChangeText={setEditTitle}
              autoFocus
              autoCorrect={false}
              autoCapitalize="sentences"
            />
            <TitleSuggestionList
              suggestions={editTitleSuggestions}
              onSelect={applyEditTitleSuggestion}
            />
            <TextInput
              style={styles.input}
              placeholder="Qté (ex. 2, 0.5…)"
              placeholderTextColor={palette.textSubtle}
              value={editQuantityText}
              onChangeText={setEditQuantityText}
              keyboardType="decimal-pad"
            />
            <UnitPicker value={editUnit} onChange={setEditUnit} />
            {editDetected ? (
              <Text style={styles.detectedHint}>
                Catégorie : {CATEGORY_LABELS[editDetected]}
              </Text>
            ) : (
              <Pressable onPress={() => setEditShowCategory((v) => !v)}>
                <Text style={styles.editCatLink}>
                  {editShowCategory
                    ? "Masquer catégories"
                    : `Catégorie : ${CATEGORY_LABELS[editCategory]} (modifier)`}
                </Text>
              </Pressable>
            )}
            {editShowCategory && !editDetected && (
              <CategoryChips value={editCategory} onChange={setEditCategory} styles={styles} />
            )}
            <View style={styles.editBtns}>
              <Pressable
                style={styles.saveBtnSmall}
                onPress={() => handleSaveEdit(item.id)}
              >
                <Text style={styles.saveBtnText}>Enregistrer</Text>
              </Pressable>
              <Pressable style={styles.cancelBtnSmall} onPress={() => setEditingId(null)}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
            </View>
          </View>
        );
      }

      return (
        <View
          key={item.id}
          style={[styles.itemCard, item.checked && styles.itemChecked, isActive && styles.itemCardDragging]}
        >
            <View style={styles.itemRow}>
              {draggable ? (
                <Pressable
                  onLongPress={drag}
                  delayLongPress={120}
                  disabled={isActive}
                  hitSlop={8}
                  style={styles.dragHandleBtn}
                >
                  <Text style={styles.dragHandle}>⠿</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.checkbox, item.checked && styles.checkboxDone]}
                onPress={() => canWrite && toggleItem.mutate({ itemId: item.id })}
                disabled={!canWrite}
              >
                {item.checked && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
              <FluentEmoji emoji={icon} size={20} />
              <View style={styles.itemContent}>
                <Text style={[styles.itemTitle, item.checked && styles.itemTitleDone]}>
                  {item.title}
                </Text>
                {(item.quantity != null || item.unit) && (
                  <Text style={styles.itemMeta}>
                    {item.quantity != null ? item.quantity : ""}
                    {item.unit ? ` ${item.unit}` : ""}
                  </Text>
                )}
              </View>
              {canWrite && (
                <View style={styles.rowBtns}>
                  <Pressable onPress={() => startEdit(item)}>
                    <FluentEmoji emoji="✏️" size={16} />
                  </Pressable>
                  <Pressable onPress={() => deleteItem.mutate({ itemId: item.id })}>
                    <FluentEmoji emoji="🗑️" size={16} />
                  </Pressable>
                </View>
              )}
            </View>
        </View>
      );
    },
    [
      editingId,
      editTitle,
      editQuantityText,
      editUnit,
      editCategory,
      editShowCategory,
      editTitleSuggestions,
      itemMemory,
      canWrite,
      toggleItem,
      deleteItem,
    ],
  );

  const renderDraggableItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<ShoppingItemRow>) =>
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
              <Pressable
                onPress={() => {
                  setShareError(null);
                  setShareOpen(true);
                }}
              >
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
                <CategoryChips value={manualCategory} onChange={setManualCategory} styles={styles} />
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
            onPress={() => clearChecked.mutate({ listId: listId! })}
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
        keyExtractor={(item: ShoppingItemRow) => item.id}
        onDragEnd={handleUncheckedDragEnd}
        activationDistance={12}
        enableLayoutAnimationExperimental={false}
        renderItem={renderDraggableItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          <>
            {checkedItems.map((item: ShoppingItemRow) => renderShoppingItem(item))}
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

      <Modal visible={shareOpen} animationType="slide" transparent onRequestClose={() => setShareOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShareOpen(false)} />
          <View
            style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.modalScrollContent}
            >
            <Text style={styles.modalTitle}>Partager la liste</Text>

            <TextInput
              style={styles.input}
              placeholder="Email de l'utilisateur"
              placeholderTextColor={palette.textSubtle}
              value={shareEmail}
              onChangeText={setShareEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.roleHint}>Droits accordés à la personne invitée :</Text>
            <View style={styles.roleRow}>
              {SHARE_ROLES.map((r) => (
                <Pressable
                  key={r}
                  style={[styles.roleBtn, shareRole === r && styles.roleBtnActive]}
                  onPress={() => setShareRole(r)}
                >
                  <Text style={[styles.roleBtnText, shareRole === r && styles.roleBtnTextActive]}>
                    {shareRoleLabel(r)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {shareError ? <Text style={styles.shareError}>{shareError}</Text> : null}

            <Pressable
              style={[styles.addBtn, !shareEmail.trim() && { opacity: 0.4 }]}
              onPress={() => {
                if (!shareEmail.trim() || !listId) return;
                shareList.mutate({ listId, emailOrId: shareEmail.trim(), role: shareRole });
              }}
              disabled={!shareEmail.trim() || shareList.isPending}
            >
              <Text style={styles.addBtnText}>Ajouter</Text>
            </Pressable>

            <Text style={styles.membersTitle}>Membres</Text>
            {list?.owner && (
              <View style={styles.memberRow}>
                <Text style={styles.memberName}>
                  {list.owner.name ?? list.owner.email} (propriétaire)
                </Text>
              </View>
            )}
            {list?.members.map((m) => (
              <View key={m.userId} style={styles.memberRow}>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{m.user.name ?? m.user.email}</Text>
                  <Pressable
                    onPress={() => {
                      const email = m.user.email;
                      if (!email || !listId) return;
                      const next = toggleShareRole(m.role as ShareRole);
                      shareList.mutate({ listId, emailOrId: email, role: next });
                    }}
                    disabled={shareList.isPending}
                  >
                    <Text style={styles.memberRoleTap}>
                      {memberRoleLabel(m.role)} · modifier
                    </Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => unshare.mutate({ listId: listId!, userId: m.userId })}>
                  <Text style={styles.unshareBtn}>Retirer</Text>
                </Pressable>
              </View>
            ))}

            <Pressable
              style={styles.modalClose}
              onPress={() => setShareOpen(false)}
              hitSlop={12}
            >
              <Text style={styles.modalCloseText}>Fermer</Text>
            </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function getStyles(palette: ReturnType<typeof getPalette>) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  content: { padding: 16 },
  contentEmbedded: { paddingHorizontal: 16, paddingTop: 0 },
  embeddedTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    minHeight: 28,
  },
  headerShare: { fontSize: 15, fontWeight: "600", color: palette.primary, marginRight: 4 },
  frequentSection: { marginBottom: 16 },
  frequentTitle: { fontSize: 13, fontWeight: "600", color: palette.textMuted, marginBottom: 8 },
  frequentRow: { flexDirection: "row", gap: 8, paddingRight: 8 },
  frequentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: palette.bgElevated,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 160,
  },
  frequentIcon: { fontSize: 16 },
  frequentLabel: { fontSize: 13, color: palette.text, fontWeight: "500" },
  readOnlyBanner: {
    fontSize: 13,
    color: palette.textMuted,
    backgroundColor: palette.bgSoft,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    textAlign: "center",
  },
  card: {
    backgroundColor: palette.bgElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    padding: 14,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: palette.text,
    marginBottom: 10,
    backgroundColor: palette.bgElevated,
  },
  detectedHint: { fontSize: 12, color: palette.primary, marginBottom: 8 },
  pickerBlock: { marginBottom: 10 },
  pickerLabel: { fontSize: 12, color: palette.textMuted, marginBottom: 6 },
  chipsScroll: { marginBottom: 4 },
  chipsRow: { flexDirection: "row", gap: 6, paddingRight: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.bgElevated,
  },
  chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  chipText: { fontSize: 12, color: palette.textMuted },
  chipTextActive: { color: palette.onPrimary },
  addBtn: {
    backgroundColor: palette.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  addBtnText: { color: palette.onPrimary, fontWeight: "600", fontSize: 14 },
  clearBtn: { alignSelf: "flex-end", marginBottom: 12 },
  clearBtnText: { fontSize: 13, color: palette.danger, fontWeight: "500" },
  itemCard: {
    backgroundColor: palette.bgElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    padding: 12,
    marginBottom: 8,
  },
  itemChecked: { opacity: 0.75 },
  itemCardDragging: {
    borderColor: palette.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  dragHint: {
    fontSize: 12,
    color: palette.textSubtle,
    marginBottom: 8,
    textAlign: "right",
  },
  dragHandleBtn: { paddingVertical: 2, paddingRight: 4 },
  dragHandle: { fontSize: 16, color: palette.border, width: 14, textAlign: "center" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: palette.primary, borderColor: palette.primary },
  checkmark: { color: palette.onPrimary, fontSize: 11, fontWeight: "700" },
  itemIcon: { fontSize: 20 },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 14, color: palette.text },
  itemTitleDone: { textDecorationLine: "line-through", color: palette.textSubtle },
  itemMeta: { fontSize: 12, color: palette.textSubtle, marginTop: 2 },
  rowBtns: { flexDirection: "row", gap: 8 },
  editIcon: { fontSize: 16 },
  deleteIcon: { fontSize: 16 },
  editCatLink: { fontSize: 12, color: palette.primary, marginBottom: 8 },
  editBtns: { flexDirection: "row", gap: 8, marginTop: 4 },
  saveBtnSmall: {
    flex: 1,
    backgroundColor: palette.primary,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
  },
  saveBtnText: { color: palette.onPrimary, fontSize: 13, fontWeight: "600" },
  cancelBtnSmall: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
  },
  cancelBtnText: { color: palette.textMuted, fontSize: 13 },
  empty: { fontSize: 13, color: palette.textSubtle, fontStyle: "italic", textAlign: "center", marginTop: 20 },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalScrollContent: { paddingBottom: 8 },
  modalCard: {
    backgroundColor: palette.bgElevated,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: palette.text, marginBottom: 16 },
  roleHint: { fontSize: 12, color: palette.textMuted, marginBottom: 8 },
  roleRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
  },
  roleBtnActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  roleBtnText: { fontSize: 12, color: palette.textMuted, textAlign: "center" },
  roleBtnTextActive: { color: palette.onPrimary },
  shareError: { fontSize: 13, color: palette.danger, marginBottom: 8 },
  membersTitle: { fontSize: 14, fontWeight: "600", color: palette.text, marginTop: 16, marginBottom: 8 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderSoft,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, color: palette.text },
  memberRoleTap: { fontSize: 12, color: palette.primary, marginTop: 2 },
  unshareBtn: { fontSize: 13, color: palette.danger },
  modalClose: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 14,
    minHeight: 48,
    justifyContent: "center",
  },
  modalCloseText: { fontSize: 15, fontWeight: "600", color: palette.textMuted },
});
}
