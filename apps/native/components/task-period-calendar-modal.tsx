import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { SchedulableAction } from "@/lib/day-week-split";
import {
  addDays,
  addMonths,
  dateKey,
  formatMonthLabel,
  getDayTaskMarkers,
  getMonthCells,
  getWeekdayLabels,
  sameDay,
  startOfMonth,
} from "@/lib/task-agenda";
import { startOfDay } from "@/lib/day-week-split";

function CalendarDayDots({
  markers,
  selected,
}: {
  markers: { hasWeekly: boolean; hasPonctual: boolean };
  selected: boolean;
}) {
  if (!markers.hasWeekly && !markers.hasPonctual) return null;
  return (
    <View style={styles.dotsRow}>
      {markers.hasPonctual && (
        <View style={[styles.dot, selected ? styles.dotPonctualSelected : styles.dotPonctual]} />
      )}
      {markers.hasWeekly && (
        <View style={[styles.dot, selected ? styles.dotWeeklySelected : styles.dotWeekly]} />
      )}
    </View>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectDay: (day: Date) => void;
  actions: SchedulableAction[];
  today: Date;
  selectedDay: Date;
};

export function TaskPeriodCalendarModal({
  visible,
  onClose,
  onSelectDay,
  actions,
  today,
  selectedDay,
}: Props) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDay));

  useEffect(() => {
    if (visible) setViewMonth(startOfMonth(selectedDay));
  }, [visible, selectedDay]);

  const monthCells = useMemo(() => getMonthCells(viewMonth), [viewMonth]);

  const markersByDay = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getDayTaskMarkers>>();
    for (const cell of monthCells) {
      const markers = getDayTaskMarkers(actions, cell.date);
      if (markers.hasWeekly || markers.hasPonctual) {
        map.set(dateKey(cell.date), markers);
      }
    }
    return map;
  }, [actions, monthCells]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Choisir le début de période</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.hint}>
            Sélectionnez un jour : les 7 jours suivants seront affichés dans « Cette semaine ».
          </Text>

          <View style={styles.monthNav}>
            <Pressable onPress={() => setViewMonth((m) => addMonths(m, -1))} hitSlop={8}>
              <Text style={styles.navBtn}>‹</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{formatMonthLabel(viewMonth)}</Text>
            <Pressable onPress={() => setViewMonth((m) => addMonths(m, 1))} hitSlop={8}>
              <Text style={styles.navBtn}>›</Text>
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {getWeekdayLabels().map((label) => (
              <Text key={label} style={styles.weekdayLabel}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {monthCells.map((cell) => {
              const key = dateKey(cell.date);
              const markers = markersByDay.get(key) ?? { hasWeekly: false, hasPonctual: false };
              const isSelected = sameDay(cell.date, selectedDay);
              const isToday = sameDay(cell.date, today);

              return (
                <Pressable
                  key={key}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                    !cell.inMonth && styles.dayCellOutside,
                  ]}
                  onPress={() => {
                    onSelectDay(cell.date);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isToday && !isSelected && styles.dayTextToday,
                      !cell.inMonth && styles.dayTextOutside,
                    ]}
                  >
                    {cell.date.getDate()}
                  </Text>
                  <CalendarDayDots markers={markers} selected={isSelected} />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dotPonctual]} />
              <Text style={styles.legendText}>Ponctuelle</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dotWeekly]} />
              <Text style={styles.legendText}>Hebdomadaire</Text>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function defaultPeriodStart(today: Date): Date {
  return addDays(startOfDay(today), 1);
}

export function formatPeriodRangeLabel(periodStart: Date): string {
  const start = startOfDay(periodStart);
  const end = addDays(start, 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  return `du ${fmt(start)} au ${fmt(end)}`;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 16,
  },
  dialog: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: "600", color: "#111827", flex: 1 },
  closeBtn: { fontSize: 18, color: "#9CA3AF", padding: 4 },
  hint: { fontSize: 12, color: "#9CA3AF", marginBottom: 16 },
  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  navBtn: { fontSize: 22, color: "#6B7280", paddingHorizontal: 8 },
  monthLabel: { fontSize: 14, fontWeight: "600", color: "#111827" },
  weekdayRow: { flexDirection: "row", marginBottom: 4 },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  dayCellSelected: { backgroundColor: "#4F46E5" },
  dayCellToday: { borderWidth: 2, borderColor: "#C7D2FE" },
  dayCellOutside: { opacity: 0.5 },
  dayText: { fontSize: 14, color: "#111827" },
  dayTextSelected: { color: "#fff", fontWeight: "600" },
  dayTextToday: { color: "#4338CA", fontWeight: "600" },
  dayTextOutside: { color: "#D1D5DB" },
  dotsRow: { flexDirection: "row", gap: 2, position: "absolute", bottom: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  dotPonctual: { backgroundColor: "#F59E0B" },
  dotPonctualSelected: { backgroundColor: "#FDE68A" },
  dotWeekly: { backgroundColor: "#A855F7" },
  dotWeeklySelected: { backgroundColor: "#E9D5FF" },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 16,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 10, color: "#9CA3AF" },
});
