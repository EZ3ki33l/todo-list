"use client";

import { useEffect, useMemo, useState } from "react";

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
    <span className="absolute bottom-1 flex items-center gap-0.5" aria-hidden>
      {markers.hasPonctual && (
        <span
          className={`size-1 rounded-full ${
            selected ? "bg-amber-200" : "bg-amber-500"
          }`}
        />
      )}
      {markers.hasWeekly && (
        <span
          className={`size-1 rounded-full ${
            selected ? "bg-purple-200" : "bg-purple-500"
          }`}
        />
      )}
    </span>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectDay: (day: Date) => void;
  actions: SchedulableAction[];
  today: Date;
  selectedDay: Date;
};

export function TaskPeriodCalendarModal({
  open,
  onClose,
  onSelectDay,
  actions,
  today,
  selectedDay,
}: Props) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDay));

  useEffect(() => {
    if (open) setViewMonth(startOfMonth(selectedDay));
  }, [open, selectedDay]);

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="period-calendar-title"
        className="relative w-full max-w-sm rounded-xl border border-app-border-soft bg-app-bg-elevated p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 id="period-calendar-title" className="text-base font-semibold text-app-text">
            Choisir le début de période
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1 text-app-text-subtle hover:bg-app-bg-soft hover:text-app-text"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-xs text-app-text-subtle">
          Sélectionnez un jour : les 7 jours suivants seront affichés dans « Cette semaine ».
        </p>

        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setViewMonth((m) => addMonths(m, -1))}
            aria-label="Mois précédent"
            className="rounded-lg p-1.5 text-app-text-subtle hover:bg-app-bg-soft hover:text-app-text"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-app-text">{formatMonthLabel(viewMonth)}</span>
          <button
            type="button"
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            aria-label="Mois suivant"
            className="rounded-lg p-1.5 text-app-text-subtle hover:bg-app-bg-soft hover:text-app-text"
          >
            ›
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {getWeekdayLabels().map((label) => (
            <div key={label} className="py-1 text-center text-[10px] font-medium uppercase text-app-text-subtle">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthCells.map((cell) => {
            const key = dateKey(cell.date);
            const markers = markersByDay.get(key) ?? { hasWeekly: false, hasPonctual: false };
            const isSelected = sameDay(cell.date, selectedDay);
            const isToday = sameDay(cell.date, today);

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onSelectDay(cell.date);
                  onClose();
                }}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                  isSelected
                    ? "bg-app-primary font-semibold text-app-on-primary"
                    : isToday
                      ? "font-semibold text-app-badge-text ring-2 ring-app-border-soft ring-inset hover:bg-app-badge-bg"
                      : cell.inMonth
                        ? "text-app-text hover:bg-app-bg-soft"
                        : "text-app-border hover:bg-app-bg-soft"
                }`}
              >
                <span>{cell.date.getDate()}</span>
                <CalendarDayDots markers={markers} selected={isSelected} />
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[10px] text-app-text-subtle">
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
            Ponctuelle
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-purple-500" aria-hidden />
            Hebdomadaire
          </span>
        </div>
      </div>
    </div>
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
