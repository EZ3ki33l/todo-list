import { withEffectiveDone } from "@repo/api";
import { prisma } from "@repo/db";
import type { Action } from "@repo/db";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@repo/api/server";

import { ActionItem } from "@/components/action-item";
import { DayWeekViewClient } from "@/components/day-week-view-client";
import {
  buildLaterDayGroups,
  buildWeekDayGroups,
  formatWeekRangeLabel,
} from "@/lib/day-week-split";

type ActionRow = inferRouterOutputs<AppRouter>["actions"]["getByList"][number];

interface Props {
  userId: string;
  listId?: string;
  listTitle?: string;
  canEdit?: boolean;
  initialActions?: ActionRow[];
}

type ActionWithList = Action & { list: { id: string; title: string } };

export default async function DayWeekView({
  userId,
  listId,
  listTitle,
  canEdit = false,
  initialActions,
}: Props) {
  if (listId && canEdit) {
    return (
      <DayWeekViewClient
        listId={listId}
        listTitle={listTitle ?? "Mes tâches"}
        canEdit
        initialActions={initialActions}
      />
    );
  }

  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const todayDow = now.getDay();

  const base = {
    OR: [
      { list: { ownerId: userId } },
      { list: { members: { some: { userId } } } },
    ],
    ...(listId ? { listId } : {}),
  };

  const [ponctualToday, dailyTasks, weeklyToday, allForSchedule] = await Promise.all([
    prisma.action.findMany({
      where: { ...base, recurrence: "NONE", dueAt: { gte: todayStart, lt: todayEnd } },
      include: { list: { select: { id: true, title: true } } },
      orderBy: { dueAt: "asc" },
    }),
    prisma.action.findMany({
      where: { ...base, recurrence: "DAILY" },
      include: { list: { select: { id: true, title: true } } },
      orderBy: { recurrenceTime: "asc" },
    }),
    prisma.action.findMany({
      where: { ...base, recurrence: "WEEKLY", recurrenceDow: todayDow },
      include: { list: { select: { id: true, title: true } } },
      orderBy: { recurrenceTime: "asc" },
    }),
    prisma.action.findMany({
      where: base,
      include: { list: { select: { id: true, title: true } } },
      orderBy: { position: "asc" },
    }),
  ]);

  const todayActions = [...ponctualToday, ...dailyTasks, ...weeklyToday].map((a) =>
    withEffectiveDone(a, now),
  );

  const scheduleRows = allForSchedule.map((a) => withEffectiveDone(a, now));
  const weekDayGroups = buildWeekDayGroups(scheduleRows, now, "schedule");
  const laterDayGroups = buildLaterDayGroups(scheduleRows, now, "schedule");
  const laterCount = laterDayGroups.reduce((n, g) => n + g.actions.length, 0);

  if (todayActions.length === 0 && weekDayGroups.length === 0 && laterCount === 0) return null;

  const showListLink = !listId;

  return (
    <section className="mb-10">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-app-text">
            Aujourd&apos;hui
            <span className="text-sm font-normal text-app-text-subtle">
              {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </h2>
          {todayActions.length === 0 ? (
            <p className="text-sm text-app-text-subtle">Rien de prévu aujourd&apos;hui.</p>
          ) : (
            <ul className="space-y-2">
              {todayActions.map((a) => (
                <ActionItem
                  key={a.id}
                  action={a as ActionWithList}
                  canEdit={canEdit}
                  showListLink={showListLink}
                />
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="mb-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-app-text">
              Cette semaine
              <span className="text-sm font-normal text-app-text-subtle">{formatWeekRangeLabel(now)}</span>
            </h2>
          </div>
          {weekDayGroups.length === 0 ? (
            <p className="text-sm text-app-text-subtle">Rien de prévu cette semaine.</p>
          ) : (
            <div className="space-y-3">
              {weekDayGroups.map((group) => {
                const weekday = group.date
                  .toLocaleDateString("fr-FR", { weekday: "short" })
                  .replace(".", "");
                const dayMonth = group.date.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                });
                return (
                  <div key={group.key} className="rounded-xl border border-app-border-soft bg-app-bg-soft/60 p-3">
                    <div className="mb-2 flex items-baseline gap-2">
                      <span className="text-sm font-semibold capitalize text-app-text">{weekday}</span>
                      <span className="text-xs text-app-text-subtle">{dayMonth}</span>
                    </div>
                    <ul className="space-y-2">
                      {group.actions.map((a) => {
                        const withList = allForSchedule.find((x) => x.id === a.id) as ActionWithList;
                        return (
                          <ActionItem
                            key={a.id}
                            action={withList}
                            canEdit={canEdit}
                            showListLink={showListLink}
                            hideDayTag
                            embedded
                          />
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
          {laterCount > 0 && (
            <details className="mt-4 border-t border-app-border-soft pt-4">
              <summary className="cursor-pointer text-sm text-app-primary hover:text-app-badge-text">
                Voir plus loin ({laterCount})
              </summary>
              <div className="mt-3 space-y-3">
                <p className="text-xs text-app-text-subtle">
                  Tâches ponctuelles planifiées au-delà de cette semaine.
                </p>
                {laterDayGroups.map((group) => (
                  <div
                    key={group.key}
                    className="rounded-xl border border-dashed border-app-border-soft p-3"
                  >
                    <p className="mb-2 text-sm font-medium capitalize text-app-text">{group.label}</p>
                    <ul className="space-y-2">
                      {group.actions.map((a) => {
                        const withList = allForSchedule.find((x) => x.id === a.id) as ActionWithList;
                        return (
                          <ActionItem
                            key={a.id}
                            action={withList}
                            canEdit={canEdit}
                            showListLink={showListLink}
                            hideDayTag
                            embedded
                          />
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </section>
  );
}
