"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { TrashIcon } from "@/components/trash-icon";
import { confirmPermanentDelete } from "@/lib/confirm-delete";
import { trpc } from "@/lib/trpc";

type Props = {
  kind: "todo" | "shopping";
  listId: string;
  title: string;
  subtitle: string;
  isOwner: boolean;
  href: string;
};

export function SharedListRow({ kind, listId, title, subtitle, isOwner, href }: Props) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const deleteTodo = trpc.lists.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.lists.getSharedTodos.invalidate(),
        utils.lists.getAll.invalidate(),
      ]);
      router.refresh();
    },
  });

  const deleteShopping = trpc.shoppingLists.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.shoppingLists.getSharedShopping.invalidate(),
        utils.shoppingLists.getAll.invalidate(),
      ]);
      router.refresh();
    },
  });

  const pending = deleteTodo.isPending || deleteShopping.isPending;

  function handleDelete() {
    if (!confirmPermanentDelete(title)) return;
    if (kind === "todo") {
      deleteTodo.mutate({ listId });
    } else {
      deleteShopping.mutate({ listId });
    }
  }

  return (
    <div className="flex overflow-hidden rounded-lg border border-app-border-soft bg-app-badge-bg/40 shadow-sm">
      <Link
        href={href}
        className="min-w-0 flex-1 px-4 py-3 transition-colors hover:bg-app-badge-bg/70"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-app-text">{title}</span>
          <span className="rounded-full bg-app-badge-bg px-2 py-0.5 text-xs font-medium text-app-badge-text">
            Partagée
          </span>
        </div>
        <p className="mt-0.5 text-sm text-app-text-subtle">{subtitle}</p>
      </Link>
      {isOwner ? (
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          aria-label={`Supprimer la liste ${title}`}
          className="flex shrink-0 items-center border-l border-app-border-soft px-3 text-app-danger transition-colors hover:bg-red-50 disabled:opacity-40"
        >
          <TrashIcon />
        </button>
      ) : null}
    </div>
  );
}
