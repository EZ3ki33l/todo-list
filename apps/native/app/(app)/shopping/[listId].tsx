import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";

import { UnitPicker } from "@/components/unit-picker";
import { useAuth } from "@/lib/auth-context";
import { detectCategory, type GroceryCategory } from "@/lib/grocery-detect";
import {
  CATEGORY_LABELS,
  itemIcon,
  PICKABLE_CATEGORIES,
} from "@/lib/grocery-ui";
import { trpc } from "@/lib/trpc";

type ShareRole = "membre" | "invité";

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

export default function ShoppingListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const navigation = useNavigation();
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

  const detectedCategory = useMemo(() => detectCategory(title), [title]);
  const resolvedCategory = detectedCategory ?? manualCategory;
  const needsCategoryPicker = !detectedCategory && title.trim().length > 0;

  useEffect(() => {
    setShowCategoryPicker(needsCategoryPicker);
  }, [needsCategoryPicker]);

  useLayoutEffect(() => {
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
  }, [navigation, list?.title, isOwner]);

  const invalidateList = () => {
    utils.shoppingItems.getByList.invalidate({ listId: listId! });
    utils.shoppingLists.getAll.invalidate();
    utils.shoppingLists.getById.invalidate({ listId: listId! });
  };

  const createItem = trpc.shoppingItems.create.useMutation({
    onSuccess: () => {
      invalidateList();
      setTitle("");
      setQuantityText("");
      setUnit(null);
      setManualCategory("AUTRE");
      setShowCategoryPicker(false);
    },
  });

  const updateItem = trpc.shoppingItems.update.useMutation({
    onSuccess: () => {
      invalidateList();
      setEditingId(null);
    },
  });

  const toggleItem = trpc.shoppingItems.toggle.useMutation({
    onSuccess: invalidateList,
  });

  const deleteItem = trpc.shoppingItems.delete.useMutation({
    onSuccess: invalidateList,
  });

  const clearChecked = trpc.shoppingItems.clearChecked.useMutation({
    onSuccess: invalidateList,
  });

  const shareList = trpc.shoppingLists.share.useMutation({
    onSuccess: () => {
      utils.shoppingLists.getById.invalidate({ listId: listId! });
      setShareEmail("");
      setShareError(null);
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

  function handleCreate() {
    if (!title.trim() || !listId || !canWrite) return;
    if (needsCategoryPicker && !manualCategory) return;
    createItem.mutate({
      listId,
      title: title.trim(),
      quantity: parseQuantity(quantityText),
      unit,
      category: resolvedCategory,
    });
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
    const cat = detectCategory(editTitle) ?? editCategory;
    updateItem.mutate({
      itemId,
      title: editTitle.trim(),
      quantity: parseQuantity(editQuantityText),
      unit: editUnit,
      category: cat,
    });
  }

  const checkedCount = items?.filter((i) => i.checked).length ?? 0;
  const hasChecked = checkedCount > 0;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {!canWrite && (
          <Text style={styles.readOnlyBanner}>Lecture seule (invité)</Text>
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
              onPress={handleCreate}
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

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          (items ?? []).map((item) => {
            const category = item.category as GroceryCategory;
            const icon = itemIcon(category, item.icon);

            if (editingId === item.id) {
              const editDetected = detectCategory(editTitle);
              return (
                <View key={item.id} style={styles.itemCard}>
                  <TextInput
                    style={styles.input}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    autoFocus
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
                        {editShowCategory ? "Masquer catégories" : `Catégorie : ${CATEGORY_LABELS[editCategory]} (modifier)`}
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
              <View key={item.id} style={[styles.itemCard, item.checked && styles.itemChecked]}>
                <View style={styles.itemRow}>
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
          })
        )}

        {!isLoading && (items?.length ?? 0) === 0 && (
          <Text style={styles.empty}>Aucun article dans cette liste.</Text>
        )}
      </ScrollView>

      <Modal visible={shareOpen} animationType="slide" transparent onRequestClose={() => setShareOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShareOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
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

            <Pressable style={styles.modalClose} onPress={() => setShareOpen(false)}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 16, paddingBottom: 40 },
  headerShare: { fontSize: 15, fontWeight: "600", color: "#111827", marginRight: 4 },
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
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
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
  modalClose: { marginTop: 16, alignItems: "center" },
  modalCloseText: { fontSize: 15, color: "#6B7280" },
});
