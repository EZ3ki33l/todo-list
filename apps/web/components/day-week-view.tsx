import { withEffectiveDone } from "@repo/api";
import { prisma } from "@repo/db";
import type { Action } from "@repo/db";

import { ActionItem } from "@/components/action-item";

interface Props {
  userId: string;
  listId?: string;
  canEdit?: boolean;
}

type ActionWithList = Action & { list: { id: string; title: string } };

export default async function DayWeekView({ userId, listId, canEdit = false }: Props) {
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const todayDow = now.getDay();
  const weekDows = Array.from({ length: 7 }, (_, i) => (todayDow + i) % 7);

  const base = {
    OR: [
      { list: { ownerId: userId } },
      { list: { members: { some: { userId } } } },
    ],
    ...(listId ? { listId } : {}),
  };

  const [ponctualToday, dailyTasks, weeklyToday, ponctualWeek, weeklyWeek] =
    await Promise.all([
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
        where: { ...base, recurrence: "NONE", dueAt: { gte: todayEnd, lt: weekEnd } },
        include: { list: { select: { id: true, title: true } } },
        orderBy: { dueAt: "asc" },
      }),
      prisma.action.findMany({
        where: {
          ...base,
          recurrence: "WEEKLY",
          recurrenceDow: { in: weekDows.filter((d) => d !== todayDow) },
        },
        include: { list: { select: { id: true, title: true } } },
        orderBy: [{ recurrenceDow: "asc" }, { recurrenceTime: "asc" }],
      }),
    ]);

  const todayActions = [...ponctualToday, ...dailyTasks, ...weeklyToday].map((a) =>
    withEffectiveDone(a, now),
  );
  const weekActions = [...ponctualWeek, ...weeklyWeek].map((a) => withEffectiveDone(a, now));

  if (todayActions.length === 0 && weekActions.length === 0) return null;

  const showListLink = !listId;

  return (
    <section className="mb-10">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Aujourd'hui */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
            Aujourd&apos;hui
            <span className="text-sm font-normal text-gray-400">
              {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </h2>
          {todayActions.length === 0 ? (
            <p className="text-sm text-gray-400">Rien de prévu aujourd&apos;hui.</p>
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

        {/* Cette semaine */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
            Cette semaine
            <span className="text-sm font-normal text-gray-400">
              jusqu&apos;au{" "}
              {weekEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
            </span>
          </h2>
          {weekActions.length === 0 ? (
            <p className="text-sm text-gray-400">Rien de prévu cette semaine.</p>
          ) : (
            <ul className="space-y-2">
              {weekActions.map((a) => (
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
      </div>
    </section>
  );
}
