import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ShoppingListDetail } from "@/components/shopping-list-detail";
import { SharedListRow } from "@/components/shared-list-row";
import { ShoppingHubSkeleton } from "@/components/shopping-hub-skeleton";
import { TabListHeader } from "@/components/tab-list-header";
import { useAuth } from "@/lib/auth-context";
import { getListHubStyles } from "@/lib/list-hub-styles";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";
import { trpc } from "@/lib/trpc";
import { usePersonalShoppingList } from "@/lib/use-personal-shopping-list";

function ownerSubtitle(
  isOwner: boolean,
  memberCount: number,
  ownerName: string | null | undefined,
  ownerEmail: string | null | undefined,
) {
  if (isOwner) {
    return memberCount > 0 ? "Vous êtes propriétaire" : "Ajoutez des membres depuis la liste";
  }
  return `Avec ${ownerName ?? ownerEmail ?? "quelqu'un"}`;
}

function itemsSubtitle(total: number) {
  if (total === 0) return "Liste vide";
  return `${total} article${total !== 1 ? "s" : ""}`;
}

function SharedShoppingSection({
  personalId,
  newSharedTitle,
  setNewSharedTitle,
  placeholderTextColor,
  hub,
  palette,
}: {
  personalId: string;
  newSharedTitle: string;
  setNewSharedTitle: (value: string) => void;
  placeholderTextColor: string;
  hub: ReturnType<typeof getListHubStyles>;
  palette: ReturnType<typeof getPalette>;
}) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: sharedListsPrimary, isError: sharedError } =
    trpc.shoppingLists.getSharedShopping.useQuery(undefined, {
      enabled: !!personalId,
      retry: 1,
    });

  const { data: allLists } = trpc.shoppingLists.getAll.useQuery(undefined, {
    enabled: !!personalId && sharedError,
  });

  const sharedLists =
    sharedListsPrimary ??
    allLists?.filter(
      (list) => list.id !== personalId && list.status === "ACTIVE",
    );

  const createSharedList = trpc.shoppingLists.create.useMutation({
    onSuccess: () => {
      void utils.shoppingLists.getSharedShopping.invalidate();
      setNewSharedTitle("");
    },
  });

  return (
    <View style={hub.section}>
      <Text style={hub.sectionTitle}>Listes partagées</Text>
      {(sharedLists?.length ?? 0) === 0 ? (
        <Text style={hub.empty}>Aucune liste de courses partagée.</Text>
      ) : (
        sharedLists?.map((list) => {
          const isOwner = list.ownerId === user?.id;
          const owner =
            "owner" in list && list.owner
              ? (list.owner as { name: string | null; email: string | null })
              : null;
          return (
            <SharedListRow
              key={list.id}
              kind="shopping"
              listId={list.id}
              title={list.title}
              subtitle={`${itemsSubtitle(list._count.items)} · ${ownerSubtitle(
                isOwner,
                list._count.members,
                owner?.name,
                owner?.email,
              )}`}
              isOwner={isOwner}
              href={`/(app)/shopping/${list.id}`}
              palette={palette}
            />
          );
        })
      )}

      <View style={[hub.createRow, { marginTop: 12 }]}>
        <TextInput
          style={hub.input}
          placeholder="Ex. Courses du chalet…"
          placeholderTextColor={placeholderTextColor}
          value={newSharedTitle}
          onChangeText={setNewSharedTitle}
          returnKeyType="done"
          onSubmitEditing={() => {
            if (newSharedTitle.trim()) {
              createSharedList.mutate({ title: newSharedTitle.trim() });
            }
          }}
        />
        <Pressable
          style={[hub.createBtn, !newSharedTitle.trim() && { opacity: 0.4 }]}
          onPress={() => {
            if (newSharedTitle.trim()) {
              createSharedList.mutate({ title: newSharedTitle.trim() });
            }
          }}
          disabled={!newSharedTitle.trim() || createSharedList.isPending}
        >
          <Text style={hub.createBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ShoppingScreen() {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const hub = useMemo(() => getListHubStyles(palette), [palette]);
  const [newSharedTitle, setNewSharedTitle] = useState("");
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const utils = trpc.useUtils();

  const {
    list: personalList,
    isLoading: loadingPersonal,
    error: personalError,
    refetch: refetchPersonal,
  } = usePersonalShoppingList();

  const itemsQuery = trpc.shoppingItems.getByList.useQuery(
    { listId: personalList?.id ?? "" },
    { enabled: !!personalList?.id, staleTime: 60_000 },
  );

  const showSkeleton =
    (loadingPersonal && !personalList) ||
    (!!personalList?.id && itemsQuery.isLoading && itemsQuery.data === undefined);

  useEffect(() => {
    void import("react-native-draggable-flatlist");
  }, []);

  const sharedFooter =
    personalList != null ? (
      <SharedShoppingSection
        personalId={personalList.id}
        newSharedTitle={newSharedTitle}
        setNewSharedTitle={setNewSharedTitle}
        placeholderTextColor={palette.textSubtle}
        hub={hub}
        palette={palette}
      />
    ) : null;

  async function handleRefresh() {
    setPullRefreshing(true);
    try {
      await refetchPersonal();
    } finally {
      setPullRefreshing(false);
    }
  }

  return (
    <SafeAreaView style={hub.safe} edges={["top"]}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 16, backgroundColor: palette.bg }}>
          <TabListHeader logoName="caddie" />
        </View>

        {showSkeleton ? (
          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            <ShoppingHubSkeleton withSharedLists />
          </View>
        ) : personalError ? (
          <ScrollView
            style={hub.container}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={pullRefreshing} onRefresh={() => void handleRefresh()} />
            }
          >
            <Text style={hub.empty}>
              Impossible de charger vos courses. Tirez pour réessayer.
            </Text>
          </ScrollView>
        ) : personalList ? (
          <View style={{ flex: 1 }}>
            <ShoppingListDetail
              listId={personalList.id}
              embedded
              footer={sharedFooter}
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
