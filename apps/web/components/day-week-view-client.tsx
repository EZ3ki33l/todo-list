"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AppRouter } from "@repo/api";
import { ActionItem, type ActionItemData } from "@/components/action-item";
import { DayWeekViewSkeleton } from "@/components/dashboard-skeleton";
import {
  defaultPeriodStart,
  formatPeriodRangeLabel,
  TaskPeriodCalendarModal,
} from "@/components/task-period-calendar-modal";
import {
  buildPeriodDayGroups,
  moveInList,
  reorderSectionInGlobal,
  splitActionsByDayWeek,
  startOfDay,
  type DayGroup,
} from "@/lib/day-week-split";
import {
  DAY_WEEK_GRID_CLASS,
  DAY_WEEK_SECTION_CLASS,
  EMPTY_TASKS_MESSAGE,
} from "@/lib/day-week-layout";
import { sameDay } from "@/lib/task-agenda";
import { applyListOrder } from "@/lib/reorder-list";
import { trpc } from "@/lib/trpc";

type ActionRow = inferRouterOutputs<AppRouter>["actions"]["getByList"][number];

/** Colonne à hauteur fixe : l'en-tête reste visible, la liste défile. */
function TaskColumnShell({
  header,
  children,
  isEmpty,
  emptyMessage = EMPTY_TASKS_MESSAGE,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
}) {
  return (
    <div className="flex h-full min-h-[8rem] max-h-[min(22rem,calc(50dvh-8rem))] flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm sm:max-h-none">
      <div className="shrink-0 border-b border-gray-50 px-4 py-3">{header}</div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        {isEmpty ? <p className="text-sm text-gray-400">{emptyMessage}</p> : children}
      </div>
    </div>
  );
}

function DraggableActionRow({
  action,
  canEdit,
  showListLink,
  hideDayTag,
  draggable,
  isDragging,
  isDragOver,
  onChanged,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  action: ActionItemData;
  canEdit: boolean;
  showListLink: boolean;
  hideDayTag?: boolean;
  draggable: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onChanged: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <li
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", action.id);
        onDragStart();
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`relative list-none ${
        isDragOver ? "rounded-lg ring-2 ring-indigo-200" : ""
      } ${isDragging ? "opacity-50" : ""}`}
    >
      {draggable && (
        <span
          className="absolute left-0 top-3 z-10 cursor-grab text-gray-300 select-none active:cursor-grabbing"
          aria-hidden
          title="Glisser pour réordonner"
        >
          ⠿
        </span>
      )}
      <div className={draggable ? "pl-5" : undefined}>
        <ActionItem
          action={action}
          canEdit={canEdit}
          showListLink={showListLink}
          hideDayTag={hideDayTag}
          embedded
          onChanged={onChanged}
        />
      </div>
    </li>
  );
}

function ActionColumn({
  title,
  subtitle,
  actions,
  sectionIds,
  globalIds,
  canEdit,
  showListLink,
  hideDayTag,
  emptyMessage = EMPTY_TASKS_MESSAGE,
  onReorder,
  onChanged,
}: {
  title: string;
  subtitle?: string;
  actions: ActionItemData[];
  sectionIds: string[];
  globalIds: string[];
  canEdit: boolean;
  showListLink: boolean;
  hideDayTag?: boolean;
  emptyMessage?: string;
  onReorder: (orderedIds: string[]) => void;
  onChanged: () => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [override, setOverride] = useState<ActionItemData[] | null>(null);

  const listData = override ?? actions;
  const dragEnabled = canEdit && listData.length > 1;

  const sectionKey = sectionIds.join(",");
  useEffect(() => {
    setOverride(null);
  }, [sectionKey]);

  const commit = useCallback(
    (fromId: string, toId: string) => {
      const currentSectionIds = listData.map((a) => a.id);
      const nextSection = moveInList(listData, fromId, toId);
      setOverride(nextSection);
      onReorder(reorderSectionInGlobal(globalIds, currentSectionIds, fromId, toId));
    },
    [globalIds, listData, onReorder],
  );

  return (
    <TaskColumnShell
      isEmpty={listData.length === 0}
      emptyMessage={emptyMessage}
      header={
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-gray-400">{subtitle}</p>}
          </div>
          {dragEnabled && (
            <p className="text-xs text-gray-400">Glisser ⠿ pour réordonner</p>
          )}
        </div>
      }
    >
      <ul className="space-y-2">
        {listData.map((action) => (
          <DraggableActionRow
            key={action.id}
            action={action}
            canEdit={canEdit}
            showListLink={showListLink}
            hideDayTag={hideDayTag}
            draggable={dragEnabled}
            isDragging={draggingId === action.id}
            isDragOver={dragOverId === action.id && draggingId !== action.id}
            onChanged={onChanged}
            onDragStart={() => setDraggingId(action.id)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverId(action.id);
            }}
            onDragLeave={() => {
              if (dragOverId === action.id) setDragOverId(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const fromId = e.dataTransfer.getData("text/plain");
              if (!fromId || fromId === action.id) return;
              commit(fromId, action.id);
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
    </TaskColumnShell>
  );
}

function DayGroupList({
  group,
  globalIds,
  canEdit,
  showListLink,
  onReorder,
  onChanged,
}: {
  group: DayGroup<ActionItemData>;
  globalIds: string[];
  canEdit: boolean;
  showListLink: boolean;
  onReorder: (orderedIds: string[]) => void;
  onChanged: () => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [override, setOverride] = useState<ActionItemData[] | null>(null);

  const sectionIds = group.actions.map((a) => a.id);
  const listData = override ?? group.actions;
  const dragEnabled = canEdit && listData.length > 1;

  useEffect(() => {
    setOverride(null);
  }, [sectionIds.join(",")]);

  const commit = useCallback(
    (fromId: string, toId: string) => {
      const currentSectionIds = listData.map((a) => a.id);
      const nextSection = moveInList(listData, fromId, toId);
      setOverride(nextSection);
      onReorder(reorderSectionInGlobal(globalIds, currentSectionIds, fromId, toId));
    },
    [globalIds, listData, onReorder],
  );

  const weekday = group.date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
  const dayMonth = group.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-sm font-semibold capitalize text-gray-900">{weekday}</span>
        <span className="text-xs text-gray-400">{dayMonth}</span>
      </div>
      <ul className="space-y-2">
        {listData.map((action) => (
          <DraggableActionRow
            key={action.id}
            action={action}
            canEdit={canEdit}
            showListLink={showListLink}
            hideDayTag
            draggable={dragEnabled}
            isDragging={draggingId === action.id}
            isDragOver={dragOverId === action.id && draggingId !== action.id}
            onChanged={onChanged}
            onDragStart={() => setDraggingId(action.id)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverId(action.id);
            }}
            onDragLeave={() => {
              if (dragOverId === action.id) setDragOverId(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const fromId = e.dataTransfer.getData("text/plain");
              if (!fromId || fromId === action.id) return;
              commit(fromId, action.id);
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
    </div>
  );
}

function WeekPeriodColumn({
  actions,
  globalIds,
  canEdit,
  showListLink,
  onReorder,
  onChanged,
  now,
  toItem,
}: {
  actions: ActionRow[];
  globalIds: string[];
  canEdit: boolean;
  showListLink: boolean;
  onReorder: (orderedIds: string[]) => void;
  onChanged: () => void;
  now: Date;
  toItem: (a: ActionRow) => ActionItemData;
}) {
  const today = startOfDay(now);
  const defaultStart = defaultPeriodStart(today);
  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const dayGroups = useMemo(() => {
    const groups = buildPeriodDayGroups(actions, periodStart, "position");
    return groups
      .filter((g) => !sameDay(g.date, today))
      .map((g) => ({ ...g, actions: g.actions.map(toItem) }));
  }, [actions, periodStart, today, toItem]);

  const isDefaultPeriod = sameDay(periodStart, defaultStart);

  return (
    <>
      <TaskColumnShell
        isEmpty={dayGroups.length === 0}
        emptyMessage={EMPTY_TASKS_MESSAGE}
        header={
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold text-gray-900">
                Cette semaine
                <span className="text-sm font-normal text-gray-400">
                  {formatPeriodRangeLabel(periodStart)}
                </span>
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isDefaultPeriod && (
                <button
                  type="button"
                  onClick={() => setPeriodStart(defaultStart)}
                  className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Semaine actuelle
                </button>
              )}
              <button
                type="button"
                onClick={() => setCalendarOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
              >
                <svg viewBox="0 0 16 16" className="size-3.5 text-gray-400" fill="currentColor" aria-hidden>
                  <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1.5A1.5 1.5 0 0 1 16 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 13.5v-11A1.5 1.5 0 0 1 1.5 1H3V.5a.5.5 0 0 1 .5-.5M1 4v9.5a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V4z" />
                </svg>
                Changer la période
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          {dayGroups.map((group) => (
            <DayGroupList
              key={group.key}
              group={group}
              globalIds={globalIds}
              canEdit={canEdit}
              showListLink={showListLink}
              onReorder={onReorder}
              onChanged={onChanged}
            />
          ))}
        </div>
      </TaskColumnShell>

      <TaskPeriodCalendarModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        onSelectDay={setPeriodStart}
        actions={actions}
        today={today}
        selectedDay={periodStart}
      />
    </>
  );
}

export function DayWeekViewClient({
  listId,
  listTitle,
  canEdit,
  initialActions,
}: {
  listId: string;
  listTitle: string;
  canEdit: boolean;
  initialActions?: ActionRow[];
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [now] = useState(() => new Date());

  const { data: actions, isLoading } = trpc.actions.getByList.useQuery(
    { listId },
    { initialData: initialActions },
  );

  const split = useMemo(() => {
    if (!actions?.length) {
      return {
        today: [] as ActionRow[],
        globalIds: [] as string[],
      };
    }
    return splitActionsByDayWeek(actions, now, "position");
  }, [actions, now]);

  const toItem = useCallback(
    (a: ActionRow): ActionItemData => ({
      id: a.id,
      title: a.title,
      done: a.done,
      recurrence: a.recurrence,
      recurrenceTime: a.recurrenceTime,
      recurrenceDow: a.recurrenceDow,
      dueAt: a.dueAt,
      streakCount: a.streakCount,
      bestStreak: a.bestStreak,
      list: { id: listId, title: listTitle },
    }),
    [listId, listTitle],
  );

  const todayItems = split.today.map(toItem);
  const scheduleActions = actions ?? [];

  const refresh = useCallback(() => {
    void utils.actions.getByList.invalidate({ listId });
    router.refresh();
  }, [listId, router, utils.actions.getByList]);

  const reorderActions = trpc.actions.reorder.useMutation({
    onSuccess: (_result, { listId: lid, orderedIds }) => {
      utils.actions.getByList.setData({ listId: lid }, (old) =>
        old ? applyListOrder(old, orderedIds) : old,
      );
    },
    onError: (_err, input) => {
      void utils.actions.getByList.invalidate({ listId: input.listId });
    },
  });

  const onReorder = useCallback(
    (orderedIds: string[]) => {
      reorderActions.mutate({ listId, orderedIds });
    },
    [listId, reorderActions],
  );

  if (isLoading && actions === undefined) {
    return <DayWeekViewSkeleton />;
  }

  return (
    <section className={DAY_WEEK_SECTION_CLASS}>
      <div className={DAY_WEEK_GRID_CLASS}>
        <ActionColumn
          title="Aujourd'hui"
          subtitle={now.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          actions={todayItems}
          sectionIds={todayItems.map((a) => a.id)}
          globalIds={split.globalIds}
          canEdit={canEdit}
          showListLink={false}
          emptyMessage={EMPTY_TASKS_MESSAGE}
          onReorder={onReorder}
          onChanged={refresh}
        />
        <WeekPeriodColumn
          actions={scheduleActions}
          globalIds={split.globalIds}
          canEdit={canEdit}
          showListLink={false}
          onReorder={onReorder}
          onChanged={refresh}
          now={now}
          toItem={toItem}
        />
      </div>
    </section>
  );
}
