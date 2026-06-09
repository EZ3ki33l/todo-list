import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { ShoppingListDetail } from "@/components/shopping-list-detail";
import { TabListHeader } from "@/components/tab-list-header";
import { useAuth } from "@/lib/auth-context";
import { listHubStyles as hub } from "@/lib/list-hub-styles";
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
}: {
  personalId: string;
  newSharedTitle: string;
  setNewSharedTitle: (value: string) => void;
}) {
  const router = useRouter();
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
            <Pressable
              key={list.id}
              style={hub.listCard}
              onPress={() => router.push(`/(app)/shopping/${list.id}`)}
            >
              <View style={hub.listMain}>
                <View style={hub.listTitleRow}>
                  <Text style={hub.listTitle}>{list.title}</Text>
                  <Text style={hub.sharedBadge}>partagée</Text>
                </View>
                <Text style={hub.listMeta}>
                  {itemsSubtitle(list._count.items)} ·{" "}
                  {ownerSubtitle(
                    isOwner,
                    list._count.members,
                    owner?.name,
                    owner?.email,
                  )}
                </Text>
              </View>
            </Pressable>
          );
        })
      )}

      <View style={[hub.createRow, { marginTop: 12 }]}>
        <TextInput
          style={hub.input}
          placeholder="Ex. Courses du chalet…"
          placeholderTextColor="#9CA3AF"
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
  const { signOut } = useAuth();
  const [newSharedTitle, setNewSharedTitle] = useState("");
  const utils = trpc.useUtils();

  const {
    list: personalList,
    isLoading: loadingPersonal,
    error: personalError,
    refetch: refetchPersonal,
  } = usePersonalShoppingList();

  useFocusEffect(
    useCallback(() => {
      void utils.shoppingLists.getOrCreatePersonal.invalidate();
      void utils.shoppingLists.getSharedShopping.invalidate();
      if (personalList) {
        void utils.shoppingItems.getByList.invalidate({ listId: personalList.id });
      }
    }, [personalList, utils]),
  );

  const sharedFooter =
    personalList != null ? (
      <SharedShoppingSection
        personalId={personalList.id}
        newSharedTitle={newSharedTitle}
        setNewSharedTitle={setNewSharedTitle}
      />
    ) : null;

  return (
    <SafeAreaView style={hub.safe} edges={["top"]}>
      <TabListHeader title="Courses" onSignOut={signOut} />

      {loadingPersonal && !personalList ? (
        <ActivityIndicator style={{ marginVertical: 24 }} />
      ) : personalError ? (
        <ScrollView
          style={hub.container}
          contentContainerStyle={hub.content}
          refreshControl={
            <RefreshControl refreshing={loadingPersonal} onRefresh={() => void refetchPersonal()} />
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
    </SafeAreaView>
  );
}
