import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";

import { confirmPermanentDelete } from "@/lib/confirm-delete";
import { getListHubStyles } from "@/lib/list-hub-styles";
import type { AppPalette } from "@/lib/theme-palette";
import { trpc } from "@/lib/trpc";

type Props = {
  kind: "todo" | "shopping";
  listId: string;
  title: string;
  subtitle: string;
  isOwner: boolean;
  href: Href;
  palette: AppPalette;
};

export function SharedListRow({
  kind,
  listId,
  title,
  subtitle,
  isOwner,
  href,
  palette,
}: Props) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const hub = useMemo(() => getListHubStyles(palette), [palette]);

  const deleteTodo = trpc.lists.delete.useMutation({
    onSuccess: () => {
      void utils.lists.getSharedTodos.invalidate();
      void utils.lists.getAll.invalidate();
    },
  });

  const deleteShopping = trpc.shoppingLists.delete.useMutation({
    onSuccess: () => {
      void utils.shoppingLists.getSharedShopping.invalidate();
      void utils.shoppingLists.getAll.invalidate();
    },
  });

  const pending = deleteTodo.isPending || deleteShopping.isPending;

  async function handleDelete() {
    if (!(await confirmPermanentDelete(title))) return;
    if (kind === "todo") {
      deleteTodo.mutate({ listId });
    } else {
      deleteShopping.mutate({ listId });
    }
  }

  return (
    <View style={hub.listCard}>
      <Pressable style={hub.listMain} onPress={() => router.push(href)}>
        <View style={hub.listTitleRow}>
          <Text style={hub.listTitle}>{title}</Text>
          <Text style={hub.sharedBadge}>partagée</Text>
        </View>
        <Text style={hub.listMeta}>{subtitle}</Text>
      </Pressable>
      {isOwner ? (
        <Pressable
          style={hub.listActions}
          onPress={() => void handleDelete()}
          disabled={pending}
          accessibilityLabel={`Supprimer la liste ${title}`}
        >
          <Text style={[hub.actionBtnRed, pending && { opacity: 0.4 }]}>🗑️</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
