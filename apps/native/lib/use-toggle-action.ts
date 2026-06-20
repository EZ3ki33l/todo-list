import { Alert } from "react-native";
import { TRPCClientError } from "@trpc/client";
import { withEffectiveDone } from "@repo/api/lib/action-recurrence";

import { asCompletionFields } from "@/lib/normalize-action-row";
import { trpc } from "@/lib/trpc";

function formatToggleError(err: unknown): string {
  if (err instanceof TRPCClientError) {
    if (err.data?.code === "UNAUTHORIZED") {
      return "Session expirée. Reconnectez-vous.";
    }
    if (err.data?.code === "FORBIDDEN") {
      return "Vous n'avez pas le droit de modifier cette tâche.";
    }
    return err.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Impossible de mettre à jour la tâche. Réessayez.";
}

type ToggleResult = {
  action?: {
    done?: boolean;
    doneAt?: string | Date | null;
    streakCount?: number | null;
    bestStreak?: number | null;
    updatedAt?: string | Date;
    recurrence?: string;
    recurrenceDow?: number | null;
  } | null;
  streakCount?: number | null;
  listDayComplete?: boolean;
  listClosed?: boolean;
};

export function useToggleAction(
  listId: string,
  options?: { onUnauthorized?: () => void },
) {
  const utils = trpc.useUtils();

  return trpc.actions.toggle.useMutation({
    onMutate: async ({ actionId }) => {
      await utils.actions.getByList.cancel({ listId });
      const previous = utils.actions.getByList.getData({ listId });
      utils.actions.getByList.setData({ listId }, (old) =>
        old?.map((a) => {
          if (a.id !== actionId) return a;
          const effectiveDone = withEffectiveDone(asCompletionFields(a)).done;
          return { ...a, done: !effectiveDone };
        }),
      );
      return { previous };
    },
    onSuccess: (result, { actionId }) => {
      const payload = result as ToggleResult;

      if (payload.action && typeof payload.action.done === "boolean") {
        utils.actions.getByList.setData({ listId }, (old) => {
          if (!old) return old;
          return old.map((a) => {
            if (a.id !== actionId) return a;
            const act = payload.action!;
            const doneAt =
              act.doneAt == null
                ? null
                : typeof act.doneAt === "string"
                  ? act.doneAt
                  : act.doneAt.toISOString();
            return {
              ...a,
              done: act.done as boolean,
              doneAt,
              streakCount: payload.streakCount ?? act.streakCount ?? a.streakCount,
              bestStreak: act.bestStreak ?? a.bestStreak,
            };
          });
        });
      } else {
        void utils.actions.getByList.invalidate({ listId });
      }

      if (payload.listClosed) {
        void utils.lists.getAll.invalidate();
        Alert.alert("Liste terminée", "Toutes les tâches ponctuelles sont faites.");
      } else if (payload.listDayComplete) {
        Alert.alert("Bravo !", "Toutes les tâches du jour sont réalisées.");
      }
    },
    onError: (err, _input, context) => {
      if (context?.previous) {
        utils.actions.getByList.setData({ listId }, context.previous);
      }

      if (err instanceof TRPCClientError && err.data?.code === "UNAUTHORIZED") {
        options?.onUnauthorized?.();
      }

      Alert.alert("Erreur", formatToggleError(err));
    },
  });
}
