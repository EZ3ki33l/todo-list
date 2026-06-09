"use client";

import { TRPCClientError } from "@trpc/client";
import { useRouter } from "next/navigation";

import { isEffectivelyDone, type ActionCompletionFields } from "@repo/api";
import { trpc } from "@/lib/trpc";

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

type ActionRow = {
  id: string;
  done: boolean;
  doneAt: string | Date | null;
  recurrence: string;
  recurrenceDow: number | null;
  updatedAt?: string | Date;
  streakCount?: number | null;
  bestStreak?: number | null;
};

function asCompletionFields(action: ActionRow): ActionCompletionFields {
  return {
    recurrence: action.recurrence as ActionCompletionFields["recurrence"],
    done: action.done,
    doneAt: action.doneAt ? new Date(action.doneAt) : null,
    recurrenceDow: action.recurrenceDow,
    updatedAt: action.updatedAt ? new Date(action.updatedAt) : undefined,
  };
}

export function useToggleAction(listId: string) {
  const router = useRouter();
  const utils = trpc.useUtils();

  return trpc.actions.toggle.useMutation({
    onMutate: async ({ actionId }) => {
      await utils.actions.getByList.cancel({ listId });
      const previous = utils.actions.getByList.getData({ listId });
      utils.actions.getByList.setData({ listId }, (old) =>
        old?.map((a) => {
          if (a.id !== actionId) return a;
          const effectiveDone = isEffectivelyDone(asCompletionFields(a as ActionRow));
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
        window.alert("Liste terminée : toutes les tâches ponctuelles sont faites.");
      } else if (payload.listDayComplete) {
        window.alert("Bravo ! Toutes les tâches du jour sont réalisées.");
      }
    },
    onError: (err, _input, context) => {
      if (context?.previous) {
        utils.actions.getByList.setData({ listId }, context.previous);
      }

      if (err instanceof TRPCClientError && err.data?.code === "UNAUTHORIZED") {
        router.push("/login");
        return;
      }

      const message =
        err instanceof TRPCClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Impossible de mettre à jour la tâche.";
      window.alert(message);
    },
  });
}
