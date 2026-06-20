import { memo, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { getPalette, type AppPalette } from "@repo/theme";

import { ActionLocationSheet } from "@/components/action-location-sheet";
import { StreakBadge } from "@/components/streak-badge";
import { FluentEmoji } from "@/components/fluent-emoji";
import { formatActionLocation, resolveMapsQuery } from "@repo/api/lib/maps";
import { formatActionDueTime } from "@repo/api/lib/action-form";
import type { ActionRow } from "@/lib/day-week-split";
import { useThemeMode } from "@/lib/theme-context";

const DOW_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type Props = {
  action: ActionRow;
  onToggle: () => void;
  onLongPressDrag?: () => void;
  dragEnabled?: boolean;
  hideDayTag?: boolean;
  compact?: boolean;
  disabled?: boolean;
  canEdit?: boolean;
  editing?: boolean;
  editTitle?: string;
  onEditTitleChange?: (value: string) => void;
  onStartEdit?: () => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  onDelete?: () => void;
  deletePending?: boolean;
};

function ActionItemRowInner({
  action,
  onToggle,
  onLongPressDrag,
  dragEnabled = false,
  hideDayTag = false,
  compact = false,
  disabled = false,
  canEdit = false,
  editing = false,
  editTitle = "",
  onEditTitleChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  deletePending = false,
}: Props) {
  const [locationOpen, setLocationOpen] = useState(false);
  const { themeName } = useThemeMode();
  const palette = useMemo(() => getPalette(themeName), [themeName]);
  const styles = useMemo(() => getStyles(palette), [palette]);

  const time = action.recurrenceTime
    ? action.recurrenceTime.slice(0, 5)
    : formatActionDueTime(action.dueAt);

  const hasLocation = Boolean(
    resolveMapsQuery(action.locationLabel ?? null, action.locationAddress ?? null),
  );
  const locationText = formatActionLocation(
    action.locationLabel ?? null,
    action.locationAddress ?? null,
  );

  if (editing) {
    return (
      <View style={styles.card}>
        <TextInput
          style={styles.editInput}
          value={editTitle}
          onChangeText={onEditTitleChange}
          autoFocus
          placeholder="Titre de la tâche"
          placeholderTextColor={palette.textSubtle}
        />
        <View style={styles.editBtns}>
          <Pressable style={styles.saveBtn} onPress={onSaveEdit}>
            <Text style={styles.saveBtnText}>Enregistrer</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={onCancelEdit}>
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {dragEnabled && (
          <Pressable
            onLongPress={onLongPressDrag}
            delayLongPress={120}
            hitSlop={8}
            style={styles.dragHandleBtn}
          >
            <Text style={styles.dragHandle}>⠿</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.checkbox, action.done && styles.checkboxDone]}
          onPress={onToggle}
          disabled={disabled}
        >
          {action.done && <Text style={styles.checkmark}>✓</Text>}
        </Pressable>
        <Pressable
          style={styles.content}
          onPress={onToggle}
          disabled={disabled}
        >
          <Text
            style={[styles.title, action.done && styles.titleDone]}
            numberOfLines={compact ? 3 : undefined}
          >
            {action.title}
          </Text>
          {action.notes ? (
            <Text style={styles.notes} numberOfLines={2}>
              {action.notes}
            </Text>
          ) : null}
          <View style={[styles.metaRow, compact && styles.metaRowCompact]}>
            {time && <Text style={styles.meta}>{time}</Text>}
            {action.recurrence === "DAILY" && (
              <Text style={styles.badgeBlue}>quotidien</Text>
            )}
            {action.recurrence === "WEEKLY" && !hideDayTag && (
              <Text style={styles.badgePurple}>
                hebdo · {action.recurrenceDow != null ? DOW_LABELS[action.recurrenceDow] : ""}
              </Text>
            )}
            {action.recurrence === "WEEKLY" && hideDayTag && (
              <Text style={styles.badgePurple}>hebdo</Text>
            )}
            {action.recurrence !== "NONE" && (
              <StreakBadge streakCount={action.streakCount} bestStreak={action.bestStreak} />
            )}
            {hasLocation && locationText ? (
              <Pressable onPress={() => setLocationOpen(true)} hitSlop={6}>
                <Text style={styles.locationLink}>📍 {locationText}</Text>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
        {canEdit && (
          <View style={styles.rowBtns}>
            <Pressable onPress={onStartEdit} hitSlop={6} accessibilityLabel="Modifier">
              <FluentEmoji emoji="✏️" size={16} />
            </Pressable>
            <Pressable
              onPress={onDelete}
              hitSlop={6}
              disabled={deletePending}
              accessibilityLabel="Supprimer"
              style={deletePending ? styles.actionIconDisabled : undefined}
            >
              <FluentEmoji emoji="🗑️" size={16} />
            </Pressable>
          </View>
        )}
      </View>
      <ActionLocationSheet
        visible={locationOpen}
        locationLabel={action.locationLabel ?? null}
        locationAddress={action.locationAddress ?? null}
        onClose={() => setLocationOpen(false)}
      />
    </View>
  );
}

function getStyles(p: AppPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: p.bgElevated,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: p.borderSoft,
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginBottom: 10,
    },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    dragHandleBtn: { paddingTop: 3 },
    dragHandle: { fontSize: 16, color: p.border },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: p.border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
      flexShrink: 0,
    },
    checkboxDone: { backgroundColor: p.success, borderColor: p.success },
    checkmark: { color: p.onPrimary, fontSize: 12, fontWeight: "700" },
    content: { flex: 1, minWidth: 0 },
    title: { fontSize: 15, lineHeight: 21, color: p.text },
    titleDone: { textDecorationLine: "line-through", color: p.textSubtle },
    notes: { fontSize: 12, color: p.textMuted, marginTop: 2 },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" },
    metaRowCompact: { marginTop: 5 },
    meta: { fontSize: 11, color: p.textSubtle },
    badgeBlue: {
      fontSize: 11,
      color: p.recurrenceDailyText,
      backgroundColor: p.recurrenceDailyBg,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    badgePurple: {
      fontSize: 11,
      color: p.recurrenceWeeklyText,
      backgroundColor: p.recurrenceWeeklyBg,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    locationLink: { fontSize: 11, color: p.primary },
    rowBtns: { flexDirection: "row", gap: 8, flexShrink: 0, paddingTop: 1 },
    actionIcon: { fontSize: 16 },
    actionIconDisabled: { opacity: 0.4 },
    editInput: {
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: p.text,
      marginBottom: 8,
    },
    editBtns: { flexDirection: "row", gap: 8 },
    saveBtn: {
      flex: 1,
      backgroundColor: p.primary,
      borderRadius: 6,
      paddingVertical: 8,
      alignItems: "center",
    },
    saveBtnText: { color: p.onPrimary, fontSize: 13, fontWeight: "600" },
    cancelBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: p.borderSoft,
      borderRadius: 6,
      paddingVertical: 8,
      alignItems: "center",
    },
    cancelBtnText: { color: p.textMuted, fontSize: 13 },
  });
}

function actionRowPropsEqual(prev: Props, next: Props): boolean {
  const a = prev.action;
  const b = next.action;
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.done === b.done &&
    a.recurrence === b.recurrence &&
    a.recurrenceTime === b.recurrenceTime &&
    a.recurrenceDow === b.recurrenceDow &&
    String(a.dueAt ?? "") === String(b.dueAt ?? "") &&
    a.streakCount === b.streakCount &&
    a.bestStreak === b.bestStreak &&
    a.locationLabel === b.locationLabel &&
    a.locationAddress === b.locationAddress &&
    prev.onToggle === next.onToggle &&
    prev.onLongPressDrag === next.onLongPressDrag &&
    prev.dragEnabled === next.dragEnabled &&
    prev.hideDayTag === next.hideDayTag &&
    prev.compact === next.compact &&
    prev.disabled === next.disabled &&
    prev.canEdit === next.canEdit &&
    prev.editing === next.editing &&
    prev.editTitle === next.editTitle &&
    prev.deletePending === next.deletePending &&
    prev.onEditTitleChange === next.onEditTitleChange &&
    prev.onStartEdit === next.onStartEdit &&
    prev.onSaveEdit === next.onSaveEdit &&
    prev.onCancelEdit === next.onCancelEdit &&
    prev.onDelete === next.onDelete
  );
}

export const ActionItemRow = memo(ActionItemRowInner, actionRowPropsEqual);

export type { ActionRow };
