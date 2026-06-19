import { useEffect, useMemo } from "react";

import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

type ShoppingList = {
  id: string;
  title: string;
  ownerId: string;
  status: string;
  createdAt: string | Date;
  _count?: { members: number; items: number };
};

function pickPersonalShoppingList(lists: ShoppingList[], userId: string) {
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

export function usePersonalShoppingList() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const primary = trpc.shoppingLists.getOrCreatePersonal.useQuery(undefined, {
    retry: 1,
  });

  const fallback = trpc.shoppingLists.getAll.useQuery(undefined, {
    enabled: !!user?.id && (primary.isError || (!primary.isLoading && !primary.data)),
  });

  const createList = trpc.shoppingLists.create.useMutation({
    onSuccess: () => {
      void utils.shoppingLists.getAll.invalidate();
      void utils.shoppingLists.getOrCreatePersonal.invalidate();
    },
  });

  const createListMutate = createList.mutate;

  const fallbackList = useMemo(() => {
    if (!user?.id || !fallback.data) return null;
    return pickPersonalShoppingList(fallback.data, user.id) ?? null;
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
      createListMutate({ title: "Courses" });
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
    (createList.data ? { ...createList.data, _count: { members: 0, items: 0 } } : null);

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
