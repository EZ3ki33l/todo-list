import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { ActionItemRow, type ActionRow } from "@/components/action-item-row";
import { FluentEmoji } from "@/components/fluent-emoji";
import { TodoHubSkeleton } from "@/components/todo-hub-skeleton";
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
import { useDeleteAction, useUpdateAction } from "@/lib/use-action-mutations";
import { normalizeActionRows } from "@/lib/normalize-action-row";
import { useRefetchTasksOnFocus } from "@/lib/use-refetch-tasks-on-focus";
import { sameDay } from "@/lib/task-agenda";
import { useToggleAction } from "@/lib/use-toggle-action";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

const STACK_BREAKPOINT = 640;

function TaskColumnShell({
  header,
  children,
  isEmpty,
  emptyMessage = "Rien de prévu.",
  stacked,
  palette,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  stacked?: boolean;
  palette: ReturnType<typeof getPalette>;
}) {
  const styles = useMemo(() => getStyles(palette), [palette]);
  return (
    <View style={[styles.columnShell, stacked && styles.columnShellStacked]}>
      <View style={styles.columnHeader}>{header}</View>
      {isEmpty ? (
        <Text style={styles.empty}>{emptyMessage}</Text>
      ) : (
        <View style={styles.columnBody}>{children}</View>
      )}
    </View>
  );
}

type TaskSectionProps = {
  actions: ActionRow[];
  onToggle: (id: string) => void;
  hideDayTag?: boolean;
  compact?: boolean;
  togglingId?: string | null;
  canEdit?: boolean;
  editingId: string | null;
  editTitle: string;
  onEditTitleChange: (value: string) => void;
  onStartEdit: (action: ActionRow) => void;
  onSaveEdit: (action: ActionRow) => void;
  onCancelEdit: () => void;
  onDelete: (actionId: string) => void;
  deletePendingId?: string | null;
};

function TaskSection({
  actions,
  onToggle,
  hideDayTag,
  compact,
  togglingId,
  canEdit,
  editingId,
  editTitle,
  onEditTitleChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  deletePendingId,
}: TaskSectionProps) {
  return (
    <>
      {actions.map((action) => (
        <ActionItemRow
          key={action.id}
          action={action}
          onToggle={() => onToggle(action.id)}
          hideDayTag={hideDayTag}
          compact={compact}
          disabled={togglingId === action.id}
          canEdit={canEdit}
          editing={editingId === action.id}
          editTitle={editTitle}
          onEditTitleChange={onEditTitleChange}
          onStartEdit={() => onStartEdit(action)}
          onSaveEdit={() => onSaveEdit(action)}
          onCancelEdit={onCancelEdit}
          onDelete={() => onDelete(action.id)}
          deletePending={deletePendingId === action.id}
        />
      ))}
    </>
  );
}

function DayGroupBlock({
  group,
  sectionProps,
  compact,
  styles,
}: {
  group: DayGroup<ActionRow>;
  sectionProps: Omit<TaskSectionProps, "actions" | "hideDayTag" | "compact">;
  compact?: boolean;
  styles: ReturnType<typeof getStyles>;
}) {
  const weekday = group.date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
  const dayMonth = group.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  return (
    <View style={styles.dayGroup}>
      <View style={styles.dayGroupHeader}>
        <Text style={styles.dayGroupWeekday}>{weekday}</Text>
        <Text style={styles.dayGroupDate}>{dayMonth}</Text>
      </View>
      <TaskSection
        actions={group.actions}
        hideDayTag
        compact={compact}
        {...sectionProps}
      />
    </View>
  );
}

export function DayWeekView({ listId, canEdit = true }: { listId: string; canEdit?: boolean }) {
  const { width } = useWindowDimensions();
  const stacked = width < STACK_BREAKPOINT;
  const compact = !stacked;
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const styles = useMemo(() => getStyles(palette), [palette]);

  const [now] = useState(() => new Date());
  const today = startOfDay(now);
  const defaultStart = defaultPeriodStart(today);
  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const { data: actions, isLoading } = trpc.actions.getByList.useQuery(
    { listId },
    { staleTime: 15_000, refetchInterval: 30_000 },
  );

  useRefetchTasksOnFocus(listId);

  const normalizedActions = useMemo(
    () => normalizeActionRows(actions ?? []),
    [actions],
  );

  const split = useMemo(() => {
    if (!normalizedActions.length) {
      return { today: [] as ActionRow[], globalIds: [] as string[] };
    }
    return splitActionsByDayWeek(normalizedActions, now, "position");
  }, [normalizedActions, now]);

  const dayGroups = useMemo(() => {
    const groups = buildPeriodDayGroups(normalizedActions, periodStart, "position");
    return groups.filter((g) => !sameDay(g.date, today));
  }, [normalizedActions, periodStart, today]);

  const isDefaultPeriod = sameDay(periodStart, defaultStart);

  const { signOut } = useAuth();
  const authOpts = { onUnauthorized: () => void signOut() };
  const toggleAction = useToggleAction(listId, authOpts);
  const updateAction = useUpdateAction(listId, authOpts);
  const deleteAction = useDeleteAction(listId, authOpts);

  const togglingId = toggleAction.isPending
    ? (toggleAction.variables?.actionId ?? null)
    : null;
  const deletePendingId = deleteAction.isPending
    ? (deleteAction.variables?.actionId ?? null)
    : null;

  const onToggle = useCallback(
    (actionId: string) => {
      if (toggleAction.isPending) return;
      toggleAction.mutate({ actionId });
    },
    [toggleAction],
  );

  const onStartEdit = useCallback((action: ActionRow) => {
    setEditingId(action.id);
    setEditTitle(action.title);
  }, []);

  const onSaveEdit = useCallback(
    (action: ActionRow) => {
      const title = editTitle.trim();
      if (!title) return;
      updateAction.mutate(
        {
          actionId: action.id,
          title,
          recurrence: action.recurrence as "NONE" | "DAILY" | "WEEKLY",
        },
        {
          onSuccess: () => {
            setEditingId(null);
            setEditTitle("");
          },
        },
      );
    },
    [editTitle, updateAction],
  );

  const onCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditTitle("");
  }, []);

  const onDelete = useCallback(
    (actionId: string) => {
      deleteAction.mutate({ actionId });
      if (editingId === actionId) {
        setEditingId(null);
        setEditTitle("");
      }
    },
    [deleteAction, editingId],
  );

  const sectionProps: Omit<TaskSectionProps, "actions" | "hideDayTag" | "compact"> = {
    onToggle,
    togglingId,
    canEdit,
    editingId,
    editTitle,
    onEditTitleChange: setEditTitle,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onDelete,
    deletePendingId,
  };

  if (isLoading && actions === undefined) {
    return <TodoHubSkeleton withSharedLists={false} columnsOnly />;
  }

  const todaySubtitle = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <View style={styles.wrapper}>
      <View style={[styles.grid, stacked && styles.gridStacked]}>
        <TaskColumnShell
          palette={palette}
          stacked={stacked}
          isEmpty={split.today.length === 0}
          header={
            <View>
              <Text style={styles.columnTitle}>Aujourd'hui</Text>
              <Text style={styles.columnSub}>{todaySubtitle}</Text>
            </View>
          }
        >
          <TaskSection
            actions={split.today}
            compact={compact}
            {...sectionProps}
          />
        </TaskColumnShell>

        <TaskColumnShell
          palette={palette}
          stacked={stacked}
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
                  <View style={styles.periodBtnContent}>
                    <FluentEmoji emoji="📅" size={14} />
                    <Text style={styles.periodBtnText}>Période</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          }
        >
          <View>
            {dayGroups.map((group) => (
              <DayGroupBlock
                key={group.key}
                group={group}
                sectionProps={sectionProps}
                compact={compact}
                styles={styles}
              />
            ))}
          </View>
        </TaskColumnShell>
      </View>

      <TaskPeriodCalendarModal
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        onSelectDay={setPeriodStart}
        actions={normalizedActions}
        today={today}
        selectedDay={periodStart}
      />
    </View>
  );
}

function getStyles(palette: ReturnType<typeof getPalette>) {
  return StyleSheet.create({
  wrapper: { marginBottom: 20 },
  grid: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  gridStacked: { flexDirection: "column", gap: 16 },
  columnShell: {
    flex: 1,
    backgroundColor: palette.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.borderSoft,
  },
  columnShellStacked: {
    flex: undefined,
    width: "100%",
  },
  columnHeader: {
    borderBottomWidth: 1,
    borderBottomColor: palette.bgSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  columnTitle: { fontSize: 16, fontWeight: "600", color: palette.text },
  columnSub: { fontSize: 13, color: palette.textSubtle, marginTop: 2 },
  columnBody: { paddingHorizontal: 10, paddingVertical: 10 },
  empty: { fontSize: 13, color: palette.textSubtle, padding: 12, fontStyle: "italic" },
  periodActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
    alignItems: "center",
  },
  periodLink: { fontSize: 11, color: palette.textMuted },
  periodBtn: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: palette.bgElevated,
  },
  periodBtnContent: { flexDirection: "row", alignItems: "center", gap: 4 },
  periodBtnText: { fontSize: 11, color: palette.textMuted, fontWeight: "500" },
  dayGroup: {
    backgroundColor: palette.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    padding: 8,
    marginBottom: 8,
  },
  dayGroupHeader: { flexDirection: "row", gap: 6, marginBottom: 6, alignItems: "baseline" },
  dayGroupWeekday: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.text,
    textTransform: "capitalize",
  },
  dayGroupDate: { fontSize: 11, color: palette.textSubtle },
});
}
