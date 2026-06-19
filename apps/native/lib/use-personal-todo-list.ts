import { useEffect, useMemo } from "react";

import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

type TodoList = {
  id: string;
  title: string;
  ownerId: string;
  status: string;
  createdAt: string | Date;
  _count?: { members: number; actions: number };
};

function pickPersonalTodoList(lists: TodoList[], userId: string) {
  return lists
    .filter(
      (list) =>
        list.ownerId === userId &&
        list.status === "ACTIVE" &&
        (list._count?.members ?? 0) === 0,
    )
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )[0];
}

export function usePersonalTodoList() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const primary = trpc.lists.getOrCreatePersonal.useQuery(undefined, {
    retry: 1,
  });

  const fallback = trpc.lists.getAll.useQuery(undefined, {
    enabled: !!user?.id && (primary.isError || (!primary.isLoading && !primary.data)),
  });

  const createList = trpc.lists.create.useMutation({
    onSuccess: () => {
      void utils.lists.getAll.invalidate();
      void utils.lists.getOrCreatePersonal.invalidate();
    },
  });

  const createListMutate = createList.mutate;

  const fallbackList = useMemo(() => {
    if (!user?.id || !fallback.data) return null;
    return pickPersonalTodoList(fallback.data, user.id) ?? null;
  }, [fallback.data, user?.id]);

  useEffect(() => {
    if (
      primary.isError &&
      fallback.isSuccess &&
      !fallbackList &&
      user?.id &&
      !createList.isPending &&
      !createList.isSuccess
    ) {
      createListMutate({ title: "Mes tâches" });
    }
  }, [
    primary.isError,
    fallback.isSuccess,
    fallbackList,
    user?.id,
    createList.isPending,
    createList.isSuccess,
    createListMutate,
  ]);

  const list =
    primary.data ??
    fallbackList ??
    (createList.data ? { ...createList.data, _count: { members: 0, actions: 0 } } : null);

  const isLoading =
    primary.isLoading ||
    (primary.isError && fallback.isLoading) ||
    (primary.isError && !list && createList.isPending);

  const error = primary.isError && fallback.isError ? primary.error : null;

  return {
    list,
    isLoading,
    error,
    refetch: async () => {
      if (!primary.isError) {
        await primary.refetch();
        return;
      }
      await fallback.refetch();
    },
  };
}
