"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CategoryChips } from "@/components/category-chips";
import { FluentEmoji } from "@/components/fluent-emoji";
import { RecipeChefChat } from "@/components/recipe-chef-chat";
import { ShareShoppingListPanel } from "@/components/share-shopping-list-panel";
import {
  ShoppingItemRow,
  type ShoppingItemRowData,
} from "@/components/shopping-item-row";
import { TitleSuggestionList } from "@/components/title-suggestion-list";
import { UnitPicker } from "@/components/unit-picker";
import {
  detectCategory,
  getTitleSuggestions,
  mergeItemMemory,
  normalizeItemTitle,
  type GroceryCategory,
  type SuggestionHistoryEntry,
  type TitleSuggestion,
} from "@/lib/grocery-detect";
import { CATEGORY_LABELS, itemIcon } from "@/lib/grocery-ui";
import { applyListOrder } from "@/lib/reorder-list";
import { parseQuantity } from "@/lib/shopping-quantity";
import { trpc } from "@/lib/trpc";

interface Props {
  listId: string;
  userId: string;
  /** Intégré au dashboard unique (sans lien retour). */
  embedded?: boolean;
  /** Liste partagée affichée dans une section dédiée. */
  shared?: boolean;
  ownerLabel?: string;
  sectionId?: string;
}

type FrequentShoppingItem = {
  title: string;
  titleNorm: string;
  category: GroceryCategory;
  quantity: number | null;
  unit: string | null;
  useCount: number;
  lastUsedAt?: string | Date | null;
};

export function ShoppingListDetail({
  listId,
  userId,
  embedded = false,
  shared = false,
  ownerLabel,
  sectionId,
}: Props) {
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

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [uncheckedOverride, setUncheckedOverride] = useState<ShoppingItemRowData[] | null>(
    null,
  );

  const utils = trpc.useUtils();

  const { data: list } = trpc.shoppingLists.getById.useQuery({ listId });
  const { data: items, isLoading } = trpc.shoppingItems.getByList.useQuery({ listId });

  const isOwner = list?.ownerId === userId;
  const isShared =
    (list?.members.length ?? 0) > 0 ||
    (!!userId && !isOwner && !!list?.members.some((m) => m.userId === userId));
  const myMember = list?.members.find((m) => m.userId === userId);
  const canWrite = isOwner || myMember?.role === "membre";

  const { data: frequentItems } = trpc.shoppingItems.getFrequent.useQuery(
    { limit: 24, minUseCount: 1 },
    { enabled: canWrite },
  );
  const { data: listCatalog } = trpc.shoppingItems.getListCatalog.useQuery(
    { listId },
    { enabled: canWrite && isShared },
  );

  const itemMemory = useMemo(() => {
    const fromItems =
      items?.map((i) => ({
        titleNorm: normalizeItemTitle(i.title),
        category: i.category as GroceryCategory,
      })) ?? [];
    const fromFrequent =
      frequentItems?.map((f) => ({
        titleNorm: f.titleNorm,
        category: f.category as GroceryCategory,
      })) ?? [];
    const fromCatalog =
      listCatalog?.map((e) => ({
        titleNorm: e.titleNorm,
        category: e.category as GroceryCategory,
      })) ?? [];
    return mergeItemMemory(fromItems, mergeItemMemory(fromFrequent, fromCatalog));
  }, [items, frequentItems, listCatalog]);

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
        category: f.category as GroceryCategory,
        source: "history",
      });
    }
    if (isShared) {
      for (const e of listCatalog ?? []) {
        push({
          title: e.title,
          titleNorm: e.titleNorm,
          category: e.category as GroceryCategory,
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

  const titleSuggestions = useMemo(() => {
    if (!canWrite || title.trim().length < 1) return [];
    const norm = normalizeItemTitle(title);
    return getTitleSuggestions(title, suggestionHistory).filter(
      (s) => normalizeItemTitle(s.title) !== norm,
    );
  }, [canWrite, title, suggestionHistory]);

  const editTitleSuggestions = useMemo(() => {
    if (!editingId || editTitle.trim().length < 1) return [];
    const norm = normalizeItemTitle(editTitle);
    return getTitleSuggestions(editTitle, suggestionHistory).filter(
      (s) => normalizeItemTitle(s.title) !== norm,
    );
  }, [editingId, editTitle, suggestionHistory]);

  const checkedItems = useMemo(
    () => (items ?? []).filter((i) => i.checked),
    [items],
  );
  const uncheckedItems = useMemo(
    () => (items ?? []).filter((i) => !i.checked),
    [items],
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

  const titlesInList = useMemo(
    () => new Set((items ?? []).map((i) => normalizeItemTitle(i.title))),
    [items],
  );

  const frequentNotInList = useMemo((): FrequentShoppingItem[] => {
    if (!frequentItems?.length) return [];
    return frequentItems
      .filter((f) => f.useCount >= 2 && !titlesInList.has(f.titleNorm))
      .sort((a, b) => {
        const ta = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
        const tb = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
        return tb - ta || b.useCount - a.useCount;
      }) as FrequentShoppingItem[];
  }, [frequentItems, titlesInList]);

  const invalidateItems = () => {
    void utils.shoppingItems.getByList.invalidate({ listId });
  };

  const invalidateAfterCreate = () => {
    invalidateItems();
    void utils.shoppingItems.getFrequent.invalidate();
    void utils.shoppingItems.getListCatalog.invalidate({ listId });
  };

  const resetAddForm = () => {
    setTitle("");
    setQuantityText("");
    setUnit(null);
    setManualCategory("AUTRE");
    setShowCategoryPicker(false);
  };

  const createItem = trpc.shoppingItems.create.useMutation({
    onSuccess: () => {
      invalidateAfterCreate();
      resetAddForm();
    },
  });

  const updateItem = trpc.shoppingItems.update.useMutation({
    onSuccess: () => {
      invalidateAfterCreate();
      setEditingId(null);
    },
  });

  const toggleItem = trpc.shoppingItems.toggle.useMutation({
    onSuccess: (updated) => {
      utils.shoppingItems.getByList.setData({ listId }, (old) =>
        old?.map((item) => (item.id === updated.id ? { ...item, checked: updated.checked } : item)),
      );
    },
  });
  const deleteItem = trpc.shoppingItems.delete.useMutation({
    onSuccess: () => invalidateAfterCreate(),
  });
  const clearChecked = trpc.shoppingItems.clearChecked.useMutation({
    onSuccess: () => invalidateItems(),
  });

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

  function handleCreate(quick?: {
    title: string;
    category: GroceryCategory;
    quantity?: number | null;
    unit?: string | null;
  }) {
    const t = quick?.title ?? title.trim();
    if (!t || !canWrite) return;
    const cat = quick?.category ?? resolvedCategory;
    createItem.mutate({
      listId,
      title: t,
      quantity: quick ? (quick.quantity ?? null) : parseQuantity(quantityText),
      unit: quick ? (quick.unit ?? null) : unit,
      category: cat,
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    handleCreate();
  }

  function startEdit(item: ShoppingItemRowData) {
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

  const dragEnabled = canWrite && !editingId;

  const moveUnchecked = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return uncheckedListData;
      const list = [...uncheckedListData];
      const fromIdx = list.findIndex((i) => i.id === fromId);
      const toIdx = list.findIndex((i) => i.id === toId);
      if (fromIdx < 0 || toIdx < 0) return list;
      const [moved] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, moved);
      return list;
    },
    [uncheckedListData],
  );

  const commitReorder = useCallback(
    (nextUnchecked: ShoppingItemRowData[]) => {
      setUncheckedOverride(nextUnchecked);
      reorderItems.mutate({
        listId,
        orderedIds: [...nextUnchecked.map((i) => i.id), ...checkedIdsRef.current],
      });
    },
    [listId, reorderItems],
  );

  if (!list) {
    return <p className="text-sm text-app-text-subtle">Chargement…</p>;
  }

  const inner = (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <Link
            href="/dashboard/shopping"
            className="text-sm text-app-text-subtle hover:text-app-text"
          >
            ← Courses
          </Link>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-app-text">{list.title}</h1>
              {isShared && (
                <span className="mt-1 inline-block rounded-full bg-app-badge-bg px-2 py-0.5 text-xs font-medium text-app-badge-text">
                  Partagée
                </span>
              )}
              {!canWrite && (
                <p className="mt-1 text-sm text-app-badge-text">Lecture seule (rôle invité)</p>
              )}
            </div>
            {isOwner && <ShareShoppingListPanel listId={listId} list={list} />}
          </div>
        </div>
      )}

      {embedded && shared && (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-app-text">{list.title}</h3>
              <span className="rounded-full bg-app-badge-bg px-2 py-0.5 text-xs font-medium text-app-badge-text">
                Partagée
              </span>
            </div>
            {ownerLabel && (
              <p className="mt-0.5 text-sm text-app-badge-text/80">{ownerLabel}</p>
            )}
            {!canWrite && (
              <p className="mt-1 text-sm text-app-badge-text">Lecture seule (rôle invité)</p>
            )}
          </div>
          {isOwner && <ShareShoppingListPanel listId={listId} list={list} />}
        </div>
      )}

      {canWrite && frequentNotInList.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold text-app-text-subtle">Ajout rapide</h2>
          <div className="flex flex-wrap gap-2">
            {frequentNotInList.map((f) => (
              <button
                key={f.titleNorm}
                type="button"
                onClick={() =>
                  handleCreate({
                    title: f.title,
                    category: f.category,
                    quantity: f.quantity,
                    unit: f.unit,
                  })
                }
                disabled={createItem.isPending}
                className="inline-flex max-w-48 items-center gap-1.5 rounded-full border border-app-border-soft bg-app-bg-elevated px-3 py-1.5 text-sm hover:bg-app-bg-soft disabled:opacity-40"
              >
                <FluentEmoji emoji={itemIcon(f.category, null, f.title)} size={18} className="shrink-0" />
                <span className="truncate">{f.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {canWrite && (
        <form
          onSubmit={handleAdd}
          className="space-y-3 rounded-lg border border-app-border-soft bg-app-bg-elevated p-4"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article (ex. tomates, lait…)"
            autoComplete="off"
            className="w-full rounded-md border border-app-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-border"
          />
          <TitleSuggestionList
            suggestions={titleSuggestions}
            onSelect={applyTitleSuggestion}
          />
          <input
            type="text"
            inputMode="decimal"
            value={quantityText}
            onChange={(e) => setQuantityText(e.target.value)}
            placeholder="Qté (ex. 2, 0.5…)"
            className="w-full rounded-md border border-app-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-border"
          />
          <UnitPicker value={unit} onChange={setUnit} />
          {detectedCategory && title.trim() ? (
            <p className="text-xs text-app-text-subtle">
              Catégorie : {CATEGORY_LABELS[detectedCategory]}
            </p>
          ) : null}
          {(showCategoryPicker || needsCategoryPicker) && title.trim() ? (
            <div>
              <p className="mb-1.5 text-xs text-app-text-subtle">Choisir une catégorie</p>
              <CategoryChips value={manualCategory} onChange={setManualCategory} />
            </div>
          ) : null}
          <button
            type="submit"
            disabled={!title.trim() || createItem.isPending}
            className="rounded-md bg-app-primary px-4 py-2 text-sm text-app-on-primary hover:opacity-90 disabled:opacity-40"
          >
            Ajouter
          </button>
        </form>
      )}

      {checkedItems.length > 0 && canWrite && (
        <button
          type="button"
          onClick={() => clearChecked.mutate({ listId })}
          disabled={clearChecked.isPending}
          className="text-sm text-app-danger hover:text-red-800 disabled:opacity-40"
        >
          Vider les articles cochés ({checkedItems.length})
        </button>
      )}

      {isLoading ? (
        <p className="text-sm text-app-text-subtle">Chargement…</p>
      ) : (
        <div className="space-y-6">
          <section>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-app-text">
                À acheter ({uncheckedListData.length})
              </h2>
              {uncheckedListData.length > 1 && dragEnabled && (
                <p className="text-xs text-app-text-subtle">Glisser ⠿ pour réordonner</p>
              )}
            </div>
            {uncheckedListData.length === 0 ? (
              <p className="text-sm text-app-text-subtle">Rien à acheter.</p>
            ) : (
              <ul className="space-y-1">
                {uncheckedListData.map((item) => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    canWrite={canWrite}
                    draggable={dragEnabled}
                    isDragging={draggingId === item.id}
                    isDragOver={dragOverId === item.id && draggingId !== item.id}
                    isEditing={editingId === item.id}
                    edit={{
                      title: editTitle,
                      quantityText: editQuantityText,
                      unit: editUnit,
                      category: editCategory,
                      showCategory: editShowCategory,
                    }}
                    itemMemory={itemMemory}
                    editSuggestions={editTitleSuggestions}
                    onToggle={() => toggleItem.mutate({ itemId: item.id })}
                    onDelete={() => deleteItem.mutate({ itemId: item.id })}
                    onStartEdit={() => startEdit(item)}
                    onEditTitleChange={setEditTitle}
                    onEditQuantityChange={setEditQuantityText}
                    onEditUnitChange={setEditUnit}
                    onEditCategoryChange={setEditCategory}
                    onEditShowCategory={setEditShowCategory}
                    onApplyEditSuggestion={applyEditTitleSuggestion}
                    onSaveEdit={() => handleSaveEdit(item.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onDragStart={() => setDraggingId(item.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverId(item.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverId === item.id) setDragOverId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromId = e.dataTransfer.getData("text/plain");
                      if (!fromId || fromId === item.id) return;
                      commitReorder(moveUnchecked(fromId, item.id));
                      setDragOverId(null);
                      setDraggingId(null);
                    }}
                    onDragEnd={() => {
                      setDragOverId(null);
                      setDraggingId(null);
                    }}
                  />
                ))}
              </ul>
            )}
          </section>

          {!embedded && canWrite ? <RecipeChefChat listId={listId} /> : null}

          {checkedItems.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-app-text-subtle">
                Dans le panier ({checkedItems.length})
              </h2>
              <ul className="space-y-1">
                {checkedItems.map((item) => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    canWrite={canWrite}
                    muted
                    isEditing={editingId === item.id}
                    edit={{
                      title: editTitle,
                      quantityText: editQuantityText,
                      unit: editUnit,
                      category: editCategory,
                      showCategory: editShowCategory,
                    }}
                    itemMemory={itemMemory}
                    editSuggestions={editTitleSuggestions}
                    onToggle={() => toggleItem.mutate({ itemId: item.id })}
                    onDelete={() => deleteItem.mutate({ itemId: item.id })}
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
                ))}
              </ul>
            </section>
          )}

          {uncheckedListData.length === 0 && checkedItems.length === 0 && (
            <p className="text-sm text-app-text-subtle">Liste vide.</p>
          )}
        </div>
      )}
    </div>
  );

  if (embedded && shared) {
    return (
      <section
        id={sectionId}
        className="scroll-mt-8 rounded-xl border-2 border-app-border-soft bg-app-badge-bg/40 p-5"
      >
        {inner}
      </section>
    );
  }

  return inner;
}
