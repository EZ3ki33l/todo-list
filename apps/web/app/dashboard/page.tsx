import { redirect } from "next/navigation";

import { withEffectiveDone } from "@repo/api";
import { auth } from "@/auth";
import { AddActionForm } from "@/components/add-action-form";
import { CreateSharedListForm } from "@/components/create-shared-list-form";
import DayWeekView from "@/components/day-week-view";
import { ListLinkCard } from "@/components/list-link-card";
import {
  getOrCreatePersonalTodoList,
  getSharedTodoLists,
} from "@/lib/default-lists";
import { progressByListIdFromActions } from "@/lib/batch-list-stats";
import { progressLabel } from "@/lib/list-progress";
import { prisma } from "@repo/db";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@repo/api/server";

type ActionRow = inferRouterOutputs<AppRouter>["actions"]["getByList"][number];

function ownerSubtitle(
  isOwner: boolean,
  memberCount: number,
  ownerName: string | null | undefined,
  ownerEmail: string | null | undefined,
) {
  if (isOwner) {
    return memberCount > 0
      ? "Vous êtes propriétaire"
      : "Ajoutez des membres depuis la liste";
  }
  return `Avec ${ownerName ?? ownerEmail ?? "quelqu'un"}`;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const personalTodo = await getOrCreatePersonalTodoList(userId);
  const sharedTodos = await getSharedTodoLists(userId, personalTodo.id);

  const now = new Date();
  const personalActions = (
    await prisma.action.findMany({
      where: { listId: personalTodo.id },
      orderBy: { position: "asc" },
    })
  ).map((action) => withEffectiveDone(action, now));

  const sharedListIds = sharedTodos.map((l) => l.id);
  const sharedActionRows =
    sharedListIds.length > 0
      ? await prisma.action.findMany({
          where: { listId: { in: sharedListIds } },
          select: {
            listId: true,
            done: true,
            doneAt: true,
            recurrence: true,
            recurrenceDow: true,
            updatedAt: true,
          },
        })
      : [];
  const progressByListId = progressByListIdFromActions(sharedListIds, sharedActionRows);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Tâches</h1>
      </header>

      <DayWeekView
        userId={userId}
        listId={personalTodo.id}
        listTitle={personalTodo.title}
        canEdit
        initialActions={personalActions as unknown as ActionRow[]}
      />

      <AddActionForm listId={personalTodo.id} />

      <section id="listes-partagees" className="scroll-mt-8 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500">Listes partagées</h2>
        {sharedTodos.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune liste partagée pour l&apos;instant.</p>
        ) : (
          <ul className="space-y-2">
            {sharedTodos.map((list) => {
              const isOwner = list.ownerId === userId;
              return (
                <li key={list.id}>
                  <ListLinkCard
                    href={`/dashboard/lists/${list.id}`}
                    title={list.title}
                    subtitle={`${progressLabel(progressByListId.get(list.id) ?? null)} · ${ownerSubtitle(
                      isOwner,
                      list._count.members,
                      list.owner.name,
                      list.owner.email,
                    )}`}
                    shared
                  />
                </li>
              );
            })}
          </ul>
        )}
        <CreateSharedListForm kind="todo" placeholder="Ex. Projet maison…" />
      </section>
    </div>
  );
}
