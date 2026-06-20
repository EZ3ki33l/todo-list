import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getPalette, type AppPalette } from "@repo/theme";

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
import { useThemeMode } from "@/lib/theme-context";

function CalendarDayDots({
  markers,
  selected,
  palette,
}: {
  markers: { hasWeekly: boolean; hasPonctual: boolean };
  selected: boolean;
  palette: AppPalette;
}) {
  if (!markers.hasWeekly && !markers.hasPonctual) return null;
  return (
    <View style={dotRowStyle}>
      {markers.hasPonctual && (
        <View style={[dotStyle, { backgroundColor: selected ? palette.markerPonctualMuted : palette.markerPonctual }]} />
      )}
      {markers.hasWeekly && (
        <View style={[dotStyle, { backgroundColor: selected ? palette.markerWeeklyMuted : palette.markerWeekly }]} />
      )}
    </View>
  );
}

const dotRowStyle = { flexDirection: "row" as const, gap: 3, alignItems: "center" as const };
const dotStyle = { width: 5, height: 5, borderRadius: 2.5 };

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
  const { themeName } = useThemeMode();
  const palette = useMemo(() => getPalette(themeName), [themeName]);
  const styles = useMemo(() => getStyles(palette), [palette]);

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
                  <View style={styles.dayCellInner}>
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
                    <View style={styles.dotsSlot}>
                      <CalendarDayDots markers={markers} selected={isSelected} palette={palette} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: palette.markerPonctual }]} />
              <Text style={styles.legendText}>Ponctuelle</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: palette.markerWeekly }]} />
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

function getStyles(p: AppPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: p.overlay,
      justifyContent: "center",
      padding: 16,
    },
    dialog: {
      backgroundColor: p.bgElevated,
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: p.borderSoft,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    title: { fontSize: 16, fontWeight: "600", color: p.text, flex: 1 },
    closeBtn: { fontSize: 18, color: p.textSubtle, padding: 4 },
    hint: { fontSize: 12, color: p.textSubtle, marginBottom: 16 },
    monthNav: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    navBtn: { fontSize: 22, color: p.textMuted, paddingHorizontal: 8 },
    monthLabel: { fontSize: 14, fontWeight: "600", color: p.text },
    weekdayRow: { flexDirection: "row", marginBottom: 4 },
    weekdayLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: 10,
      fontWeight: "600",
      color: p.textSubtle,
      textTransform: "uppercase",
    },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    dayCell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      borderRadius: 8,
      padding: 2,
    },
    dayCellInner: {
      flex: 1,
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 6,
      paddingBottom: 4,
    },
    dayCellSelected: { backgroundColor: p.primary },
    dayCellToday: { borderWidth: 2, borderColor: p.badgeBg },
    dayCellOutside: { opacity: 0.5 },
    dayText: { fontSize: 14, lineHeight: 18, color: p.text },
    dayTextSelected: { color: p.onPrimary, fontWeight: "600" },
    dayTextToday: { color: p.badgeText, fontWeight: "600" },
    dayTextOutside: { color: p.border },
    dotsSlot: {
      minHeight: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    legend: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 16,
      marginTop: 16,
    },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    legendDot: { width: 6, height: 6, borderRadius: 3 },
    legendText: { fontSize: 10, color: p.textSubtle },
  });
}
