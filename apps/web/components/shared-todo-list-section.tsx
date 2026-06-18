"use client";

import { AddActionForm } from "@/components/add-action-form";
import { ActionListPanel } from "@/components/action-list-panel";
import { TodoListShareHeader } from "@/components/todo-list-share-header";

export function SharedTodoListSection({
  listId,
  title,
  isOwner,
  canWrite,
  ownerLabel,
}: {
  listId: string;
  title: string;
  isOwner: boolean;
  canWrite: boolean;
  ownerLabel: string;
}) {
  return (
    <section
      id={`shared-todo-${listId}`}
      className="scroll-mt-8 rounded-xl border-2 border-app-border-soft bg-app-badge-bg/40 p-5 space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-app-text">{title}</h3>
            <span className="rounded-full bg-app-badge-bg px-2 py-0.5 text-xs font-medium text-app-badge-text">
              Partagée
            </span>
          </div>
          <p className="mt-0.5 text-sm text-app-badge-text/80">{ownerLabel}</p>
          {!canWrite && (
            <p className="mt-1 text-sm text-app-badge-text">Lecture seule (rôle invité)</p>
          )}
        </div>
        {isOwner && (
          <TodoListShareHeader listId={listId} isOwner isShared />
        )}
      </div>

      {canWrite && <AddActionForm listId={listId} />}
      <ActionListPanel listId={listId} listTitle={title} canEdit={canWrite} />
    </section>
  );
}
