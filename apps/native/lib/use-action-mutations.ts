import { trpc } from "@/lib/trpc";

export function useUpdateAction(listId: string, options?: { onUnauthorized?: () => void }) {
  const utils = trpc.useUtils();

  return trpc.actions.update.useMutation({
    onSuccess: () => {
      void utils.actions.getByList.invalidate({ listId });
    },
    onError: (err) => {
      if ((err as { data?: { code?: string } }).data?.code === "UNAUTHORIZED") {
        options?.onUnauthorized?.();
      }
    },
  });
}

export function useDeleteAction(listId: string, options?: { onUnauthorized?: () => void }) {
  const utils = trpc.useUtils();

  return trpc.actions.delete.useMutation({
    onMutate: async ({ actionId }) => {
      await utils.actions.getByList.cancel({ listId });
      const previous = utils.actions.getByList.getData({ listId });
      utils.actions.getByList.setData({ listId }, (old) =>
        old?.filter((a) => a.id !== actionId),
      );
      return { previous };
    },
    onError: (err, _input, context) => {
      if (context?.previous) {
        utils.actions.getByList.setData({ listId }, context.previous);
      }
      if ((err as { data?: { code?: string } }).data?.code === "UNAUTHORIZED") {
        options?.onUnauthorized?.();
      }
    },
    onSettled: () => {
      void utils.actions.getByList.invalidate({ listId });
    },
  });
}
