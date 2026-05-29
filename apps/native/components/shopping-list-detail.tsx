import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DraggableFlatList, { type RenderItemParams } from "react-native-draggable-flatlist";
import { useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PushOptInCard } from "@/components/push-opt-in-card";
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
import { trpc } from "@/lib/trpc";

type ShareRole = "membre" | "invité";

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
}: {
  value: GroceryCategory;
  onChange: (c: GroceryCategory) => void;
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

  const refreshListData = async () => {
    if (!listId) return;
    await Promise.all([
      utils.shoppingItems.getByList.invalidate({ listId }),
      utils.shoppingLists.getAll.invalidate(),
      utils.shoppingLists.getById.invalidate({ listId }),
      utils.shoppingItems.getFrequent.invalidate(),
      utils.shoppingItems.getListCatalog.invalidate({ listId }),
    ]);
  };

  const createItem = trpc.shoppingItems.create.useMutation({
    onSuccess: async () => {
      await refreshListData();
      setTitle("");
      setQuantityText("");
      setUnit(null);
      setManualCategory("AUTRE");
      setShowCategoryPicker(false);
    },
  });

  const updateItem = trpc.shoppingItems.update.useMutation({
    onSuccess: async () => {
      await refreshListData();
      setEditingId(null);
    },
  });

  const toggleItem = trpc.shoppingItems.toggle.useMutation({
    onSuccess: refreshListData,
  });

  const deleteItem = trpc.shoppingItems.delete.useMutation({
    onSuccess: refreshListData,
  });

  const clearChecked = trpc.shoppingItems.clearChecked.useMutation({
    onSuccess: refreshListData,
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
      const icon = itemIcon(category, item.icon);
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
              placeholderTextColor="#9CA3AF"
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
              <CategoryChips value={editCategory} onChange={setEditCategory} />
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
              <Text style={styles.itemIcon}>{icon}</Text>
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
                    <Text style={styles.editIcon}>✏️</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteItem.mutate({ itemId: item.id })}>
                    <Text style={styles.deleteIcon}>🗑</Text>
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

  const listHeader = (
    <>
        {embedded && isOwner ? (
          <Pressable
            style={styles.embeddedShareRow}
            onPress={() => {
              setShareError(null);
              setShareOpen(true);
            }}
          >
            <Text style={styles.headerShare}>Partager la liste</Text>
          </Pressable>
        ) : null}

        <PushOptInCard visible={!!list && isShared} />

        {!canWrite && (
          <Text style={styles.readOnlyBanner}>Lecture seule (invité)</Text>
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
                    <Text style={styles.frequentIcon}>
                      {itemIcon(f.category)}
                    </Text>
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
              placeholderTextColor="#9CA3AF"
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
              placeholderTextColor="#9CA3AF"
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

        {isLoading ? <ActivityIndicator style={{ marginTop: 20 }} /> : null}
    </>
  );

  return (
    <>
      <DraggableFlatList
        data={uncheckedListData}
        keyExtractor={(item) => item.id}
        onDragEnd={handleUncheckedDragEnd}
        activationDistance={12}
        enableLayoutAnimationExperimental={false}
        renderItem={renderDraggableItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          <>
            {checkedItems.map((item) => renderShoppingItem(item))}
            {!isLoading && (items?.length ?? 0) === 0 && (
              <Text style={styles.empty}>Aucun article dans cette liste.</Text>
            )}
            {footer}
          </>
        }
        containerStyle={styles.container}
        contentContainerStyle={styles.content}
      />

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
              placeholderTextColor="#9CA3AF"
              value={shareEmail}
              onChangeText={setShareEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={styles.roleRow}>
              {(["membre", "invité"] as ShareRole[]).map((r) => (
                <Pressable
                  key={r}
                  style={[styles.roleBtn, shareRole === r && styles.roleBtnActive]}
                  onPress={() => setShareRole(r)}
                >
                  <Text style={[styles.roleBtnText, shareRole === r && styles.roleBtnTextActive]}>
                    {r === "membre" ? "Membre (édition)" : "Invité (lecture)"}
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
                  <Text style={styles.memberRole}>{m.role}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 16, paddingBottom: 40 },
  embeddedShareRow: { alignSelf: "flex-end", marginBottom: 12 },
  headerShare: { fontSize: 15, fontWeight: "600", color: "#111827", marginRight: 4 },
  frequentSection: { marginBottom: 16 },
  frequentTitle: { fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 8 },
  frequentRow: { flexDirection: "row", gap: 8, paddingRight: 8 },
  frequentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 160,
  },
  frequentIcon: { fontSize: 16 },
  frequentLabel: { fontSize: 13, color: "#111827", fontWeight: "500" },
  readOnlyBanner: {
    fontSize: 13,
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  detectedHint: { fontSize: 12, color: "#16A34A", marginBottom: 8 },
  pickerBlock: { marginBottom: 10 },
  pickerLabel: { fontSize: 12, color: "#6B7280", marginBottom: 6 },
  chipsScroll: { marginBottom: 4 },
  chipsRow: { flexDirection: "row", gap: 6, paddingRight: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  chipText: { fontSize: 12, color: "#374151" },
  chipTextActive: { color: "#fff" },
  addBtn: {
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  clearBtn: { alignSelf: "flex-end", marginBottom: 12 },
  clearBtnText: { fontSize: 13, color: "#DC2626", fontWeight: "500" },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 8,
  },
  itemChecked: { opacity: 0.75 },
  itemCardDragging: {
    borderColor: "#111827",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  dragHint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 8,
    textAlign: "right",
  },
  dragHandleBtn: { paddingVertical: 2, paddingRight: 4 },
  dragHandle: { fontSize: 16, color: "#D1D5DB", width: 14, textAlign: "center" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  checkmark: { color: "#fff", fontSize: 11, fontWeight: "700" },
  itemIcon: { fontSize: 20 },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 14, color: "#111827" },
  itemTitleDone: { textDecorationLine: "line-through", color: "#9CA3AF" },
  itemMeta: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  rowBtns: { flexDirection: "row", gap: 8 },
  editIcon: { fontSize: 16 },
  deleteIcon: { fontSize: 16 },
  editCatLink: { fontSize: 12, color: "#2563EB", marginBottom: 8 },
  editBtns: { flexDirection: "row", gap: 8, marginTop: 4 },
  saveBtnSmall: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  cancelBtnSmall: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
  },
  cancelBtnText: { color: "#6B7280", fontSize: 13 },
  empty: { fontSize: 13, color: "#9CA3AF", fontStyle: "italic", textAlign: "center", marginTop: 20 },
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
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 16 },
  roleRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  roleBtnActive: { backgroundColor: "#111827", borderColor: "#111827" },
  roleBtnText: { fontSize: 12, color: "#374151", textAlign: "center" },
  roleBtnTextActive: { color: "#fff" },
  shareError: { fontSize: 13, color: "#DC2626", marginBottom: 8 },
  membersTitle: { fontSize: 14, fontWeight: "600", color: "#111827", marginTop: 16, marginBottom: 8 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, color: "#111827" },
  memberRole: { fontSize: 12, color: "#9CA3AF" },
  unshareBtn: { fontSize: 13, color: "#DC2626" },
  modalClose: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 14,
    minHeight: 48,
    justifyContent: "center",
  },
  modalCloseText: { fontSize: 15, fontWeight: "600", color: "#374151" },
});
