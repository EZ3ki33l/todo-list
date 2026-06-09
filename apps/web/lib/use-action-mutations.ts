"use client";

import { TRPCClientError } from "@trpc/client";
import { useRouter } from "next/navigation";

import { trpc } from "@/lib/trpc";

export function useUpdateAction(listId: string) {
  const router = useRouter();
  const utils = trpc.useUtils();

  return trpc.actions.update.useMutation({
    onSuccess: () => {
      void utils.actions.getByList.invalidate({ listId });
    },
    onError: (err) => {
      if (err instanceof TRPCClientError && err.data?.code === "UNAUTHORIZED") {
        router.push("/login");
      }
    },
  });
}

export function useDeleteAction(listId: string) {
  const router = useRouter();
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
      if (err instanceof TRPCClientError && err.data?.code === "UNAUTHORIZED") {
        router.push("/login");
      }
    },
    onSettled: () => {
      void utils.actions.getByList.invalidate({ listId });
    },
  });
}
