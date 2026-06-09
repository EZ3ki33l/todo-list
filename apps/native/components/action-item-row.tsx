import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { StreakBadge } from "@/components/streak-badge";
import type { ActionRow } from "@/lib/day-week-split";

const DOW_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type Props = {
  action: ActionRow;
  onToggle: () => void;
  onLongPressDrag?: () => void;
  dragEnabled?: boolean;
  hideDayTag?: boolean;
  /** Colonne étroite (2 colonnes côte à côte sur tablette). */
  compact?: boolean;
  disabled?: boolean;
};

function ActionItemRowInner({
  action,
  onToggle,
  onLongPressDrag,
  dragEnabled = false,
  hideDayTag = false,
  compact = false,
  disabled = false,
}: Props) {
  const time = action.recurrenceTime
    ? action.recurrenceTime.slice(0, 5)
    : action.dueAt
      ? new Date(action.dueAt).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={({ pressed }) => [styles.card, pressed && !disabled && styles.cardPressed]}
      android_ripple={{ color: "rgba(0,0,0,0.06)" }}
    >
      <View style={styles.row}>
        {dragEnabled && (
          <Pressable
            onLongPress={onLongPressDrag}
            delayLongPress={120}
            hitSlop={8}
            style={styles.dragHandleBtn}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.dragHandle}>⠿</Text>
          </Pressable>
        )}
        <View style={[styles.checkbox, action.done && styles.checkboxDone]}>
          {action.done && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={styles.content}>
          <Text
            style={[styles.title, action.done && styles.titleDone]}
            numberOfLines={compact ? 3 : undefined}
          >
            {action.title}
          </Text>
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
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  cardPressed: {
    backgroundColor: "#F9FAFB",
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dragHandleBtn: { paddingTop: 3 },
  dragHandle: { fontSize: 16, color: "#D1D5DB" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxDone: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  checkmark: { color: "#fff", fontSize: 12, fontWeight: "700" },
  content: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, lineHeight: 21, color: "#111827" },
  titleDone: { textDecorationLine: "line-through", color: "#9CA3AF" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" },
  metaRowCompact: { marginTop: 5 },
  meta: { fontSize: 11, color: "#9CA3AF" },
  badgeBlue: {
    fontSize: 11,
    color: "#2563EB",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePurple: {
    fontSize: 11,
    color: "#7C3AED",
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

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
    prev.onToggle === next.onToggle &&
    prev.onLongPressDrag === next.onLongPressDrag &&
    prev.dragEnabled === next.dragEnabled &&
    prev.hideDayTag === next.hideDayTag &&
    prev.compact === next.compact &&
    prev.disabled === next.disabled
  );
}

export const ActionItemRow = memo(ActionItemRowInner, actionRowPropsEqual);

export type { ActionRow };
