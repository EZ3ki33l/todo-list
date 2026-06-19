"use client";

import { useRouter } from "next/navigation";

import { TrashIcon } from "@/components/trash-icon";
import { confirmPermanentDelete } from "@/lib/confirm-delete";
import { trpc } from "@/lib/trpc";

export function TodoListDeleteButton({
  listId,
  title,
}: {
  listId: string;
  title: string;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const deleteList = trpc.lists.delete.useMutation({
    onSuccess: async () => {
      await utils.lists.getAll.invalidate();
      router.refresh();
    },
  });

  function handleDelete() {
    if (!confirmPermanentDelete(title)) return;
    deleteList.mutate({ listId });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleteList.isPending}
      aria-label={`Supprimer la liste ${title}`}
      className="rounded border border-app-border-soft p-2 text-app-danger hover:bg-red-50 disabled:opacity-40"
    >
      <TrashIcon />
    </button>
  );
}
