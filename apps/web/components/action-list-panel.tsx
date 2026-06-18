"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { AppRouter } from "@repo/api/server";
import { ActionItem } from "@/components/action-item";
import { applyListOrder } from "@/lib/reorder-list";
import { trpc } from "@/lib/trpc";

type ActionRow = inferRouterOutputs<AppRouter>["actions"]["getByList"][number];
type ActionWithList = ActionRow & { list: { id: string; title: string } };

export function ActionListPanel({
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
  const utils = trpc.useUtils();

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [orderOverride, setOrderOverride] = useState<ActionWithList[] | null>(null);

  const { data: actions, isLoading } = trpc.actions.getByList.useQuery(
    { listId },
    {
      initialData: initialActions,
      staleTime: initialActions ? 60_000 : 0,
    },
  );

  const actionRows: ActionWithList[] = useMemo(
    () =>
      (actions ?? []).map((a) => ({
        ...a,
        list: { id: listId, title: listTitle },
      })),
    [actions, listId, listTitle],
  );

  const listData = orderOverride ?? actionRows;

  const actionIdsKey = useMemo(
    () => actionRows.map((a) => a.id).sort().join(","),
    [actionRows],
  );
  useEffect(() => {
    setOrderOverride(null);
  }, [actionIdsKey]);

  const refresh = useCallback(() => {
    void utils.actions.getByList.invalidate({ listId });
  }, [listId, utils.actions.getByList]);

  const reorderActions = trpc.actions.reorder.useMutation({
    onSuccess: (_result, { listId: lid, orderedIds }) => {
      utils.actions.getByList.setData({ listId: lid }, (old) =>
        old ? applyListOrder(old, orderedIds) : old,
      );
      setOrderOverride(null);
    },
    onError: (_err, input) => {
      setOrderOverride(null);
      void utils.actions.getByList.invalidate({ listId: input.listId });
    },
  });

  const moveAction = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return listData;
      const list = [...listData];
      const fromIdx = list.findIndex((a) => a.id === fromId);
      const toIdx = list.findIndex((a) => a.id === toId);
      if (fromIdx < 0 || toIdx < 0) return list;
      const [moved] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, moved);
      return list;
    },
    [listData],
  );

  const commitReorder = useCallback(
    (next: ActionWithList[]) => {
      setOrderOverride(next);
      reorderActions.mutate({ listId, orderedIds: next.map((a) => a.id) });
    },
    [listId, reorderActions],
  );

  const dragEnabled = canEdit && listData.length > 1;

  if (isLoading) {
    return <p className="text-sm text-app-text-subtle">Chargement des actions…</p>;
  }

  if (listData.length === 0) {
    return <p className="text-sm text-app-text-subtle">Aucune action dans cette liste.</p>;
  }

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-app-text">
          Toutes les actions ({listData.length})
        </h2>
        {dragEnabled && (
          <p className="text-xs text-app-text-subtle">Glisser ⠿ pour réordonner</p>
        )}
      </div>
      <ul className="space-y-2">
        {listData.map((action) => (
          <li
            key={action.id}
            draggable={dragEnabled}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", action.id);
              setDraggingId(action.id);
            }}
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
              commitReorder(moveAction(fromId, action.id));
              setDragOverId(null);
              setDraggingId(null);
            }}
            onDragEnd={() => {
              setDragOverId(null);
              setDraggingId(null);
            }}
            className={`relative ${
              dragOverId === action.id && draggingId !== action.id
                ? "rounded-lg ring-2 ring-app-border-soft"
                : ""
            } ${draggingId === action.id ? "opacity-50" : ""}`}
          >
            {dragEnabled && (
              <span
                className="absolute left-1 top-3 z-10 cursor-grab text-app-border select-none active:cursor-grabbing"
                aria-hidden
                title="Glisser pour réordonner"
              >
                ⠿
              </span>
            )}
            <div className={dragEnabled ? "pl-5" : undefined}>
              <ActionItem
                action={action}
                canEdit={canEdit}
                showListLink={false}
                embedded
                onChanged={refresh}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
