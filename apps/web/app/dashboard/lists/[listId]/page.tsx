import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@repo/db";
import { deleteAction } from "@/app/actions/action";
import { AddActionForm } from "@/components/add-action-form";
import DayWeekView from "@/components/day-week-view";
import { EditableTitle } from "@/components/editable-title";

export default async function ListPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const list = await prisma.todoList.findUnique({
    where: { id: listId },
    include: {
      actions: { orderBy: { position: "asc" } },
      members: { where: { userId: session.user.id } },
    },
  });

  if (!list) redirect("/dashboard");

  const isOwner = list.ownerId === session.user.id;
  const membership = list.members[0];
  if (!isOwner && !membership) redirect("/dashboard");

  const canWrite = isOwner || membership?.role === "membre";
  const total = list.actions.length;
  const done = list.actions.filter((a) => a.done).length;

  return (
    <>
      {/* En-tête */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-gray-700"
        >
          ← Mes listes
        </Link>
        <span className="text-gray-300">/</span>
        {isOwner ? (
          <EditableTitle
            listId={list.id}
            initialTitle={list.title}
            className="text-2xl font-bold text-gray-900"
          />
        ) : (
          <h1 className="text-2xl font-bold text-gray-900">{list.title}</h1>
        )}
        {total > 0 && (
          <span className="ml-auto text-sm text-gray-400">
            {done} / {total} fait{done > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Formulaire d'ajout */}
      {canWrite && <AddActionForm listId={list.id} />}

      {/* Vue du jour / semaine filtrée sur cette liste */}
      <DayWeekView userId={session.user.id} listId={list.id} canEdit={canWrite} />

    </>
  );
}
