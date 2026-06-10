import { useCallback } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";

import { trpc } from "@/lib/trpc";

/** Rafraîchit les tâches quand l'écran ou l'app repasse au premier plan. */
export function useRefetchTasksOnFocus(listId: string | undefined) {
  const utils = trpc.useUtils();

  useFocusEffect(
    useCallback(() => {
      if (!listId) return;

      void utils.actions.getByList.invalidate({ listId });

      const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          void utils.actions.getByList.invalidate({ listId });
        }
      });

      return () => sub.remove();
    }, [listId, utils]),
  );
}
