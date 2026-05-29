import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { PushOptInCard } from "@/components/push-opt-in-card";
import { TabListHeader } from "@/components/tab-list-header";
import { useAuth } from "@/lib/auth-context";
import { listHubStyles as hub } from "@/lib/list-hub-styles";
import { trpc } from "@/lib/trpc";

export default function ShoppingListsScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [newTitle, setNewTitle] = useState("");
  const [showSection, setShowSection] = useState<"ARCHIVED" | "DONE" | null>(null);

  const utils = trpc.useUtils();
  const { data: lists, isLoading, refetch } = trpc.shoppingLists.getAll.useQuery();

  useFocusEffect(
    useCallback(() => {
      void utils.shoppingLists.getAll.invalidate();
    }, [utils]),
  );

  const createList = trpc.shoppingLists.create.useMutation({
    onSuccess: () => {
      utils.shoppingLists.getAll.invalidate();
      setNewTitle("");
    },
  });

  const updateStatus = trpc.shoppingLists.updateStatus.useMutation({
    onSuccess: () => utils.shoppingLists.getAll.invalidate(),
  });

  const deleteList = trpc.shoppingLists.delete.useMutation({
    onMutate: async ({ listId }) => {
      await utils.shoppingLists.getAll.cancel();
      const previous = utils.shoppingLists.getAll.getData();
      utils.shoppingLists.getAll.setData(
        undefined,
        (old) => old?.filter((l) => l.id !== listId),
      );
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) {
        utils.shoppingLists.getAll.setData(undefined, ctx.previous);
      }
      Alert.alert("Erreur", "Impossible de supprimer la liste. Réessayez.");
    },
    onSettled: async (_data, _err, { listId }) => {
      utils.shoppingLists.getById.remove({ listId });
      await utils.shoppingLists.getAll.invalidate();
      await refetch();
    },
  });

  function confirmDeleteList(listId: string, title: string) {
    Alert.alert(
      "Supprimer cette liste ?",
      `« ${title} » sera supprimée pour vous et pour les personnes avec qui elle est partagée.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => deleteList.mutate({ listId }),
        },
      ],
    );
  }

  const activeLists = lists?.filter((l) => l.status === "ACTIVE") ?? [];
  const archivedLists = lists?.filter((l) => l.status === "ARCHIVED") ?? [];
  const doneLists = lists?.filter((l) => l.status === "DONE") ?? [];

  const hasSharedList =
    lists?.some((l) =>
      l.ownerId === user?.id ? l._count.members > 0 : true,
    ) ?? false;

  return (
    <SafeAreaView style={hub.safe} edges={["top"]}>
      <ScrollView
        style={hub.container}
        contentContainerStyle={hub.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <TabListHeader title="Mes courses" onSignOut={signOut} />

        <PushOptInCard visible={hasSharedList} />

        <View style={hub.section}>
          <View style={hub.createRow}>
            <TextInput
              style={hub.input}
              placeholder="Nouvelle liste de courses..."
              placeholderTextColor="#9CA3AF"
              value={newTitle}
              onChangeText={setNewTitle}
              onSubmitEditing={() => {
                if (newTitle.trim()) createList.mutate({ title: newTitle.trim() });
              }}
              returnKeyType="done"
            />
            <Pressable
              style={({ pressed }) => [
                hub.createBtn,
                pressed && { opacity: 0.8 },
                !newTitle.trim() && { opacity: 0.4 },
              ]}
              onPress={() => {
                if (newTitle.trim()) createList.mutate({ title: newTitle.trim() });
              }}
              disabled={!newTitle.trim() || createList.isPending}
            >
              <Text style={hub.createBtnText}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={hub.section}>
          <Text style={hub.sectionTitle}>
            En cours <Text style={hub.count}>({activeLists.length})</Text>
          </Text>
          {activeLists.map((list) => {
            const isSharedWithMe = list.ownerId !== user?.id;
            return (
            <View key={list.id} style={hub.listCard}>
              <Pressable
                style={hub.listMain}
                onPress={() => router.push(`/(app)/shopping/${list.id}`)}
              >
                <View style={hub.listTitleRow}>
                  <Text style={hub.listTitle}>{list.title}</Text>
                  {isSharedWithMe ? (
                    <Text style={hub.sharedBadge}>Partagée</Text>
                  ) : list._count.members > 0 ? (
                    <Text style={hub.sharedBadge}>Partagée</Text>
                  ) : null}
                </View>
                <Text style={hub.listMeta}>
                  {list._count.items} article{list._count.items !== 1 ? "s" : ""}
                  {isSharedWithMe ? " · avec vous" : ""}
                </Text>
              </Pressable>
              <View style={hub.listActions}>
                <Pressable onPress={() => updateStatus.mutate({ listId: list.id, status: "DONE" })}>
                  <Text style={hub.actionBtnGreen}>✓</Text>
                </Pressable>
                <Pressable onPress={() => updateStatus.mutate({ listId: list.id, status: "ARCHIVED" })}>
                  <Text style={hub.actionBtnGray}>⊟</Text>
                </Pressable>
                <Pressable onPress={() => confirmDeleteList(list.id, list.title)}>
                  <Text style={hub.actionBtnRed}>✕</Text>
                </Pressable>
              </View>
            </View>
          );
          })}
          {activeLists.length === 0 && <Text style={hub.empty}>Aucune liste en cours.</Text>}
        </View>

        <Pressable
          onPress={() => setShowSection(showSection === "ARCHIVED" ? null : "ARCHIVED")}
          style={hub.collapseHeader}
        >
          <Text style={hub.sectionTitle}>
            {showSection === "ARCHIVED" ? "▾" : "▸"} Archivées{" "}
            <Text style={hub.count}>({archivedLists.length})</Text>
          </Text>
        </Pressable>
        {showSection === "ARCHIVED" &&
          archivedLists.map((list) => (
            <View key={list.id} style={hub.listCard}>
              <Pressable
                style={hub.listMain}
                onPress={() => router.push(`/(app)/shopping/${list.id}`)}
              >
                <Text style={hub.listTitle}>{list.title}</Text>
              </Pressable>
              <View style={hub.listActions}>
                <Pressable onPress={() => updateStatus.mutate({ listId: list.id, status: "ACTIVE" })}>
                  <Text style={hub.actionBtnGreen}>↩</Text>
                </Pressable>
                <Pressable onPress={() => confirmDeleteList(list.id, list.title)}>
                  <Text style={hub.actionBtnRed}>✕</Text>
                </Pressable>
              </View>
            </View>
          ))}

        <Pressable
          onPress={() => setShowSection(showSection === "DONE" ? null : "DONE")}
          style={hub.collapseHeader}
        >
          <Text style={hub.sectionTitle}>
            {showSection === "DONE" ? "▾" : "▸"} Terminées{" "}
            <Text style={hub.count}>({doneLists.length})</Text>
          </Text>
        </Pressable>
        {showSection === "DONE" &&
          doneLists.map((list) => (
            <View key={list.id} style={hub.listCard}>
              <Pressable
                style={hub.listMain}
                onPress={() => router.push(`/(app)/shopping/${list.id}`)}
              >
                <Text style={hub.listTitle}>{list.title}</Text>
              </Pressable>
              <View style={hub.listActions}>
                <Pressable onPress={() => updateStatus.mutate({ listId: list.id, status: "ACTIVE" })}>
                  <Text style={hub.actionBtnGreen}>↩</Text>
                </Pressable>
                <Pressable onPress={() => confirmDeleteList(list.id, list.title)}>
                  <Text style={hub.actionBtnRed}>✕</Text>
                </Pressable>
              </View>
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}
