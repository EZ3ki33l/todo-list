"use client";

import { memo } from "react";

import { CategoryChips } from "@/components/category-chips";
import { FluentEmoji } from "@/components/fluent-emoji";
import { TitleSuggestionList } from "@/components/title-suggestion-list";
import { UnitPicker } from "@/components/unit-picker";
import {
  detectCategory,
  type GroceryCategory,
  type ItemMemory,
  type TitleSuggestion,
} from "@/lib/grocery-detect";
import { CATEGORY_LABELS, itemIcon } from "@/lib/grocery-ui";

export type ShoppingItemRowData = {
  id: string;
  title: string;
  quantity: number | null;
  unit: string | null;
  category: string;
  icon: string | null;
  checked: boolean;
};

type EditState = {
  title: string;
  quantityText: string;
  unit: string | null;
  category: GroceryCategory;
  showCategory: boolean;
};

function ShoppingItemRowInner({
  item,
  canWrite,
  muted,
  draggable,
  isDragOver,
  isDragging,
  isEditing,
  edit,
  itemMemory,
  editSuggestions,
  onToggle,
  onDelete,
  onStartEdit,
  onEditTitleChange,
  onEditQuantityChange,
  onEditUnitChange,
  onEditCategoryChange,
  onEditShowCategory,
  onApplyEditSuggestion,
  onSaveEdit,
  onCancelEdit,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  item: ShoppingItemRowData;
  canWrite: boolean;
  muted?: boolean;
  draggable?: boolean;
  isDragOver?: boolean;
  isDragging?: boolean;
  isEditing: boolean;
  edit: EditState;
  itemMemory: ItemMemory[];
  editSuggestions: TitleSuggestion[];
  onToggle: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onEditTitleChange: (v: string) => void;
  onEditQuantityChange: (v: string) => void;
  onEditUnitChange: (v: string | null) => void;
  onEditCategoryChange: (c: GroceryCategory) => void;
  onEditShowCategory: (v: boolean) => void;
  onApplyEditSuggestion: (s: TitleSuggestion) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}) {
  const category = item.category as GroceryCategory;
  const icon = itemIcon(category, item.icon, item.title);
  const editDetected = detectCategory(edit.title, itemMemory);

  if (isEditing) {
    return (
      <li className="rounded-md border border-app-border-soft bg-app-bg-elevated p-3 space-y-2">
        <input
          type="text"
          value={edit.title}
          onChange={(e) => onEditTitleChange(e.target.value)}
          autoFocus
          className="w-full rounded-md border border-app-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-border"
        />
        <TitleSuggestionList
          suggestions={editSuggestions}
          onSelect={onApplyEditSuggestion}
        />
        <input
          type="text"
          inputMode="decimal"
          value={edit.quantityText}
          onChange={(e) => onEditQuantityChange(e.target.value)}
          placeholder="Qté (ex. 2, 0.5…)"
          className="w-full rounded-md border border-app-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-app-border"
        />
        <UnitPicker value={edit.unit} onChange={onEditUnitChange} />
        {editDetected ? (
          <p className="text-xs text-app-text-subtle">
            Catégorie : {CATEGORY_LABELS[editDetected]}
          </p>
        ) : edit.showCategory || edit.title.trim() ? (
          <div>
            <p className="mb-1.5 text-xs text-app-text-subtle">Choisir une catégorie</p>
            <CategoryChips value={edit.category} onChange={onEditCategoryChange} />
          </div>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSaveEdit}
            disabled={!edit.title.trim()}
            className="rounded-md bg-app-primary px-3 py-1.5 text-xs text-app-on-primary hover:opacity-90 disabled:opacity-40"
          >
            Enregistrer
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-md border border-app-border-soft px-3 py-1.5 text-xs text-app-text-muted hover:bg-app-bg-soft"
          >
            Annuler
          </button>
        </div>
      </li>
    );
  }

  return (
    <li
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", item.id);
        onDragStart?.();
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors ${
        muted ? "border-app-border-soft bg-app-bg-soft opacity-75" : "border-app-border-soft bg-app-bg-elevated"
      } ${isDragOver ? "border-app-border bg-app-badge-bg" : ""} ${isDragging ? "opacity-50" : ""}`}
    >
      {draggable && (
        <span
          className="cursor-grab text-app-border select-none active:cursor-grabbing"
          aria-hidden
          title="Glisser pour réordonner"
        >
          ⠿
        </span>
      )}
      <input
        type="checkbox"
        checked={item.checked}
        disabled={!canWrite}
        onChange={onToggle}
        className="size-4 shrink-0 rounded border-app-border"
      />
      <FluentEmoji emoji={icon} size={20} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <span
          className={`block text-sm ${item.checked ? "text-app-text-subtle line-through" : "text-app-text"}`}
        >
          {item.title}
        </span>
        {(item.quantity != null || item.unit) && (
          <span className="text-xs text-app-text-subtle">
            {item.quantity != null ? item.quantity : ""}
            {item.unit ? ` ${item.unit}` : ""}
          </span>
        )}
      </div>
      {canWrite && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onStartEdit}
            className="rounded p-1 text-sm hover:bg-app-bg-soft"
            aria-label="Modifier"
          >
            <FluentEmoji emoji="✏️" size={18} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-xs text-app-danger hover:bg-red-50 hover:text-app-danger"
            aria-label="Supprimer"
          >
            ✕
          </button>
        </div>
      )}
    </li>
  );
}

function shoppingRowPropsEqual(
  prev: Parameters<typeof ShoppingItemRowInner>[0],
  next: Parameters<typeof ShoppingItemRowInner>[0],
): boolean {
  const a = prev.item;
  const b = next.item;
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.quantity === b.quantity &&
    a.unit === b.unit &&
    a.category === b.category &&
    a.icon === b.icon &&
    a.checked === b.checked &&
    prev.canWrite === next.canWrite &&
    prev.muted === next.muted &&
    prev.draggable === next.draggable &&
    prev.isDragOver === next.isDragOver &&
    prev.isDragging === next.isDragging &&
    prev.isEditing === next.isEditing &&
    prev.edit === next.edit &&
    prev.itemMemory === next.itemMemory &&
    prev.editSuggestions === next.editSuggestions &&
    prev.onToggle === next.onToggle &&
    prev.onDelete === next.onDelete &&
    prev.onStartEdit === next.onStartEdit &&
    prev.onEditTitleChange === next.onEditTitleChange &&
    prev.onEditQuantityChange === next.onEditQuantityChange &&
    prev.onEditUnitChange === next.onEditUnitChange &&
    prev.onEditCategoryChange === next.onEditCategoryChange &&
    prev.onEditShowCategory === next.onEditShowCategory &&
    prev.onApplyEditSuggestion === next.onApplyEditSuggestion &&
    prev.onSaveEdit === next.onSaveEdit &&
    prev.onCancelEdit === next.onCancelEdit &&
    prev.onDragStart === next.onDragStart &&
    prev.onDragOver === next.onDragOver &&
    prev.onDragLeave === next.onDragLeave &&
    prev.onDrop === next.onDrop &&
    prev.onDragEnd === next.onDragEnd
  );
}

export const ShoppingItemRow = memo(ShoppingItemRowInner, shoppingRowPropsEqual);
