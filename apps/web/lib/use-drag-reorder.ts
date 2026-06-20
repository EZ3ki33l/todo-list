"use client";

import { useCallback, useEffect, useState } from "react";
import { moveInList, reorderSectionInGlobal } from "@/lib/day-week-split";

/**
 * Gère le drag-and-drop de réordonnancement pour une section d'actions.
 * Valide que le fromId appartient bien à la section courante (défense en profondeur)
 * avant toute mutation — le serveur vérifie aussi via assertOrderedIdsMatch.
 */
export function useDragReorder<T extends { id: string }>({
  items,
  globalIds,
  canEdit,
  onReorder,
}: {
  items: T[];
  globalIds: string[];
  canEdit: boolean;
  onReorder: (orderedIds: string[]) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [override, setOverride] = useState<T[] | null>(null);

  const listData = override ?? items;
  const dragEnabled = canEdit && listData.length > 1;

  const sectionKey = items.map((i) => i.id).join(",");
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

  const handleDragStart = useCallback((id: string) => {
    setDraggingId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  }, []);

  const handleDragLeave = useCallback((id: string) => {
    setDragOverId((prev) => (prev === id ? null : prev));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toId: string) => {
      e.preventDefault();
      const fromId = e.dataTransfer.getData("text/plain");
      if (!fromId || fromId === toId) return;

      // Défense en profondeur : rejeter tout ID qui n'appartient pas à cette section.
      // Empêche un drag provenant d'une autre liste ou d'une extension malveillante
      // d'injecter un identifiant arbitraire.
      const sectionIds = new Set(listData.map((a) => a.id));
      if (!sectionIds.has(fromId) || !sectionIds.has(toId)) return;

      commit(fromId, toId);
      setDragOverId(null);
      setDraggingId(null);
    },
    [commit, listData],
  );

  const handleDragEnd = useCallback(() => {
    setDragOverId(null);
    setDraggingId(null);
  }, []);

  return {
    listData,
    dragEnabled,
    draggingId,
    dragOverId,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  };
}
