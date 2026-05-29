import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";

import { ActionItemRow, type ActionRow } from "@/components/action-item-row";
import {
  defaultPeriodStart,
  formatPeriodRangeLabel,
  TaskPeriodCalendarModal,
} from "@/components/task-period-calendar-modal";
import {
  buildPeriodDayGroups,
  splitActionsByDayWeek,
  startOfDay,
  type DayGroup,
} from "@/lib/day-week-split";
import { applyListOrder } from "@/lib/reorder-list";
import { sameDay } from "@/lib/task-agenda";
import { trpc } from "@/lib/trpc";

const COLUMN_HEIGHT = 280;

function TaskColumnShell({
  header,
  children,
  isEmpty,
  emptyMessage = "Rien de prévu.",
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
}) {
  return (
    <View style={styles.columnShell}>
      <View style={styles.columnHeader}>{header}</View>
      {isEmpty ? (
        <Text style={styles.empty}>{emptyMessage}</Text>
      ) : (
        <View style={styles.columnBody}>{children}</View>
      )}
    </View>
  );
}

function DraggableSection({
  actions,
  globalIds,
  onReorder,
  onToggle,
  hideDayTag,
}: {
  actions: ActionRow[];
  globalIds: string[];
  onReorder: (orderedIds: string[]) => void;
  onToggle: (id: string) => void;
  hideDayTag?: boolean;
}) {
  const [override, setOverride] = useState<ActionRow[] | null>(null);
  const listData = override ?? actions;
  const dragEnabled = listData.length > 1;

  useEffect(() => {
    setOverride(null);
  }, [actions.map((a) => a.id).join(",")]);

  const onDragEnd = useCallback(
    ({ data }: { data: ActionRow[] }) => {
      const sectionIds = listData.map((a) => a.id);
      setOverride(data);
      const newSectionIds = data.map((a) => a.id);
      const sectionSet = new Set(sectionIds);
      const out: string[] = [];
      let inserted = false;
      for (const id of globalIds) {
        if (sectionSet.has(id)) {
          if (!inserted) {
            out.push(...newSectionIds);
            inserted = true;
          }
        } else {
          out.push(id);
        }
      }
      onReorder(out);
    },
    [globalIds, listData, onReorder],
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<ActionRow>) => (
      <ScaleDecorator>
        <View style={isActive ? styles.dragging : undefined}>
          <ActionItemRow
            action={item}
            onToggle={() => onToggle(item.id)}
            onLongPressDrag={dragEnabled ? drag : undefined}
            dragEnabled={dragEnabled}
            hideDayTag={hideDayTag}
          />
        </View>
      </ScaleDecorator>
    ),
    [dragEnabled, hideDayTag, onToggle],
  );

  if (!dragEnabled) {
    return (
      <>
        {listData.map((action) => (
          <ActionItemRow
            key={action.id}
            action={action}
            onToggle={() => onToggle(action.id)}
            hideDayTag={hideDayTag}
          />
        ))}
      </>
    );
  }

  return (
    <DraggableFlatList
      data={listData}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      onDragEnd={onDragEnd}
      activationDistance={12}
      scrollEnabled
      nestedScrollEnabled
      containerStyle={styles.draggableList}
      contentContainerStyle={styles.draggableContent}
    />
  );
}

function DayGroupBlock({
  group,
  globalIds,
  onReorder,
  onToggle,
}: {
  group: DayGroup<ActionRow>;
  globalIds: string[];
  onReorder: (orderedIds: string[]) => void;
  onToggle: (id: string) => void;
}) {
  const weekday = group.date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
  const dayMonth = group.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  return (
    <View style={styles.dayGroup}>
      <View style={styles.dayGroupHeader}>
        <Text style={styles.dayGroupWeekday}>{weekday}</Text>
        <Text style={styles.dayGroupDate}>{dayMonth}</Text>
      </View>
      <DraggableSection
        actions={group.actions}
        globalIds={globalIds}
        onReorder={onReorder}
        onToggle={onToggle}
        hideDayTag
      />
    </View>
  );
}

export function DayWeekView({ listId }: { listId: string }) {
  const [now] = useState(() => new Date());
  const today = startOfDay(now);
  const defaultStart = defaultPeriodStart(today);
  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: actions, isLoading } = trpc.actions.getByList.useQuery({ listId });

  const split = useMemo(() => {
    if (!actions?.length) {
      return { today: [] as ActionRow[], globalIds: [] as string[] };
    }
    return splitActionsByDayWeek(actions, now, "position");
  }, [actions, now]);

  const dayGroups = useMemo(() => {
    const groups = buildPeriodDayGroups(actions ?? [], periodStart, "position");
    return groups.filter((g) => !sameDay(g.date, today));
  }, [actions, periodStart, today]);

  const isDefaultPeriod = sameDay(periodStart, defaultStart);

  const toggleAction = trpc.actions.toggle.useMutation({
    onSuccess: (result) => {
      void utils.actions.getByList.invalidate({ listId });
      if (result.listClosed) {
        Alert.alert("Liste terminée", "Toutes les tâches ponctuelles sont faites.");
      } else if (result.listDayComplete) {
        Alert.alert("Bravo !", "Toutes les tâches du jour sont réalisées.");
      }
    },
  });

  const reorderActions = trpc.actions.reorder.useMutation({
    onSuccess: (_result, { listId: lid, orderedIds }) => {
      utils.actions.getByList.setData({ listId: lid }, (old) =>
        old ? applyListOrder(old, orderedIds) : old,
      );
    },
    onError: () => {
      void utils.actions.getByList.invalidate({ listId });
    },
  });

  const onReorder = useCallback(
    (orderedIds: string[]) => {
      reorderActions.mutate({ listId, orderedIds });
    },
    [listId, reorderActions],
  );

  const onToggle = useCallback(
    (actionId: string) => {
      toggleAction.mutate({ actionId });
    },
    [toggleAction],
  );

  if (isLoading) {
    return <ActivityIndicator style={{ marginVertical: 20 }} />;
  }

  if ((actions?.length ?? 0) === 0) {
    return null;
  }

  const todaySubtitle = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <View style={styles.wrapper}>
      <View style={styles.grid}>
        <TaskColumnShell
          isEmpty={split.today.length === 0}
          header={
            <View>
              <Text style={styles.columnTitle}>Aujourd'hui</Text>
              <Text style={styles.columnSub}>{todaySubtitle}</Text>
              {split.today.length > 1 && (
                <Text style={styles.dragHint}>Maintenir ⠿ pour réordonner</Text>
              )}
            </View>
          }
        >
          <DraggableSection
            actions={split.today}
            globalIds={split.globalIds}
            onReorder={onReorder}
            onToggle={onToggle}
          />
        </TaskColumnShell>

        <TaskColumnShell
          isEmpty={dayGroups.length === 0}
          emptyMessage="Rien de prévu sur cette période."
          header={
            <View>
              <Text style={styles.columnTitle}>Cette semaine</Text>
              <Text style={styles.columnSub}>{formatPeriodRangeLabel(periodStart)}</Text>
              <View style={styles.periodActions}>
                {!isDefaultPeriod && (
                  <Pressable onPress={() => setPeriodStart(defaultStart)}>
                    <Text style={styles.periodLink}>Semaine actuelle</Text>
                  </Pressable>
                )}
                <Pressable style={styles.periodBtn} onPress={() => setCalendarOpen(true)}>
                  <Text style={styles.periodBtnText}>📅 Période</Text>
                </Pressable>
              </View>
            </View>
          }
        >
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
            {dayGroups.map((group) => (
              <DayGroupBlock
                key={group.key}
                group={group}
                globalIds={split.globalIds}
                onReorder={onReorder}
                onToggle={onToggle}
              />
            ))}
          </ScrollView>
        </TaskColumnShell>
      </View>

      <TaskPeriodCalendarModal
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        onSelectDay={setPeriodStart}
        actions={actions ?? []}
        today={today}
        selectedDay={periodStart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 20 },
  grid: { flexDirection: "row", gap: 12, height: COLUMN_HEIGHT },
  columnShell: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden",
  },
  columnHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  columnTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  columnSub: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  dragHint: { fontSize: 10, color: "#9CA3AF", marginTop: 4 },
  columnBody: { flex: 1, paddingHorizontal: 8, paddingVertical: 8 },
  empty: { fontSize: 13, color: "#9CA3AF", padding: 12, fontStyle: "italic" },
  periodActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
    alignItems: "center",
  },
  periodLink: { fontSize: 11, color: "#6B7280" },
  periodBtn: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#fff",
  },
  periodBtnText: { fontSize: 11, color: "#374151", fontWeight: "500" },
  dayGroup: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    padding: 8,
    marginBottom: 8,
  },
  dayGroupHeader: { flexDirection: "row", gap: 6, marginBottom: 6, alignItems: "baseline" },
  dayGroupWeekday: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    textTransform: "capitalize",
  },
  dayGroupDate: { fontSize: 11, color: "#9CA3AF" },
  draggableList: { flex: 1 },
  draggableContent: { paddingBottom: 4 },
  dragging: { opacity: 0.9 },
});
