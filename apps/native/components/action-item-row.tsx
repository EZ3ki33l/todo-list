import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ActionRow } from "@/lib/day-week-split";

const DOW_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type Props = {
  action: ActionRow;
  onToggle: () => void;
  onLongPressDrag?: () => void;
  dragEnabled?: boolean;
  hideDayTag?: boolean;
};

export function ActionItemRow({
  action,
  onToggle,
  onLongPressDrag,
  dragEnabled = false,
  hideDayTag = false,
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
          hitSlop={4}
        >
          {action.done && <Text style={styles.checkmark}>✓</Text>}
        </Pressable>
        <View style={styles.content}>
          <Text style={[styles.title, action.done && styles.titleDone]} numberOfLines={2}>
            {action.title}
          </Text>
          <View style={styles.metaRow}>
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
            {action.recurrence !== "NONE" && action.streakCount > 0 && (
              <Text style={styles.badgeOrange}>
                série {action.streakCount}
                {action.bestStreak > action.streakCount
                  ? ` · record ${action.bestStreak}`
                  : ""}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    padding: 10,
    marginBottom: 8,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  dragHandleBtn: { paddingTop: 2 },
  dragHandle: { fontSize: 16, color: "#D1D5DB" },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxDone: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  checkmark: { color: "#fff", fontSize: 11, fontWeight: "700" },
  content: { flex: 1 },
  title: { fontSize: 14, color: "#111827" },
  titleDone: { textDecorationLine: "line-through", color: "#9CA3AF" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
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
  badgeOrange: {
    fontSize: 11,
    color: "#C2410C",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

export type { ActionRow };
