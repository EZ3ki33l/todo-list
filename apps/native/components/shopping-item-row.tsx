import { Pressable, Text, TextInput, View } from "react-native";

import { CategoryChips } from "@/components/category-chips";
import { FluentEmoji } from "@/components/fluent-emoji";
import { TitleSuggestionList } from "@/components/title-suggestion-list";
import { UnitPicker } from "@/components/unit-picker";
import {
  detectCategory,
  type GroceryCategory,
  type ItemMemory,
  type TitleSuggestion,
} from "@repo/domain/grocery-detect";
import { CATEGORY_LABELS, itemIcon } from "@repo/domain/grocery-ui";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";
import { getStyles } from "@/components/shopping-list-detail.styles";

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

type Props = {
  item: ShoppingItemRowData;
  canWrite: boolean;
  draggable?: boolean;
  drag?: () => void;
  isActive?: boolean;
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
};

export function ShoppingItemRow({
  item,
  canWrite,
  draggable,
  drag,
  isActive,
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
}: Props) {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const styles = getStyles(palette);

  const category = item.category as GroceryCategory;
  const icon = itemIcon(category, item.icon, item.title);

  if (isEditing) {
    const editDetected = detectCategory(edit.title, itemMemory);
    return (
      <View style={styles.itemCard}>
        <TextInput
          style={styles.input}
          value={edit.title}
          onChangeText={onEditTitleChange}
          autoFocus
          autoCorrect={false}
          autoCapitalize="sentences"
        />
        <TitleSuggestionList suggestions={editSuggestions} onSelect={onApplyEditSuggestion} />
        <TextInput
          style={styles.input}
          placeholder="Qté (ex. 2, 0.5…)"
          placeholderTextColor={palette.textSubtle}
          value={edit.quantityText}
          onChangeText={onEditQuantityChange}
          keyboardType="decimal-pad"
        />
        <UnitPicker value={edit.unit} onChange={onEditUnitChange} />
        {editDetected ? (
          <Text style={styles.detectedHint}>Catégorie : {CATEGORY_LABELS[editDetected]}</Text>
        ) : (
          <Pressable onPress={() => onEditShowCategory(!edit.showCategory)}>
            <Text style={styles.editCatLink}>
              {edit.showCategory
                ? "Masquer catégories"
                : `Catégorie : ${CATEGORY_LABELS[edit.category]} (modifier)`}
            </Text>
          </Pressable>
        )}
        {edit.showCategory && !editDetected && (
          <CategoryChips value={edit.category} onChange={onEditCategoryChange} />
        )}
        <View style={styles.editBtns}>
          <Pressable style={styles.saveBtnSmall} onPress={onSaveEdit}>
            <Text style={styles.saveBtnText}>Enregistrer</Text>
          </Pressable>
          <Pressable style={styles.cancelBtnSmall} onPress={onCancelEdit}>
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
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
          onPress={() => canWrite && onToggle()}
          disabled={!canWrite}
        >
          {item.checked && <Text style={styles.checkmark}>✓</Text>}
        </Pressable>
        <FluentEmoji emoji={icon} size={20} />
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, item.checked && styles.itemTitleDone]}>{item.title}</Text>
          {(item.quantity != null || item.unit) && (
            <Text style={styles.itemMeta}>
              {item.quantity != null ? item.quantity : ""}
              {item.unit ? ` ${item.unit}` : ""}
            </Text>
          )}
        </View>
        {canWrite && (
          <View style={styles.rowBtns}>
            <Pressable onPress={onStartEdit}>
              <FluentEmoji emoji="✏️" size={16} />
            </Pressable>
            <Pressable onPress={onDelete}>
              <FluentEmoji emoji="🗑️" size={16} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
