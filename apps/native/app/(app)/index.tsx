import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AddActionForm } from "@/components/add-action-form";
import { DayWeekView } from "@/components/day-week-view";
import { TabListHeader } from "@/components/tab-list-header";
import { listHubStyles as hub } from "@/lib/list-hub-styles";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { usePersonalTodoList } from "@/lib/use-personal-todo-list";

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

export default function DashboardScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [newSharedTitle, setNewSharedTitle] = useState("");

  const utils = trpc.useUtils();

  const {
    list: personalList,
    isLoading: loadingPersonal,
    error: personalError,
    refetch: refetchPersonal,
  } = usePersonalTodoList();

  const { data: sharedListsPrimary, isError: sharedError, refetch: refetchShared } =
    trpc.lists.getSharedTodos.useQuery(undefined, {
      enabled: !!personalList,
      retry: 1,
    });

  const { data: allLists } = trpc.lists.getAll.useQuery(undefined, {
    enabled: !!personalList && sharedError,
  });

  const sharedLists =
    sharedListsPrimary ??
    allLists?.filter(
      (list) =>
        list.id !== personalList?.id &&
        list.status === "ACTIVE",
    );

  const createSharedList = trpc.lists.create.useMutation({
    onSuccess: () => {
      void utils.lists.getSharedTodos.invalidate();
      setNewSharedTitle("");
    },
  });

  const refreshing = loadingPersonal;

  return (
    <SafeAreaView style={hub.safe} edges={["top"]}>
      <ScrollView
        style={hub.container}
        contentContainerStyle={hub.content}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void refetchPersonal();
              void refetchShared();
            }}
          />
        }
      >
        <TabListHeader title="Tâches" onSignOut={signOut} />

        {loadingPersonal && !personalList ? (
          <ActivityIndicator style={{ marginVertical: 24 }} />
        ) : personalError ? (
          <Text style={hub.empty}>
            Impossible de charger vos tâches. Tirez pour réessayer.
          </Text>
        ) : personalList ? (
          <>
            <DayWeekView listId={personalList.id} />
            <AddActionForm listId={personalList.id} />
          </>
        ) : null}

        <View style={hub.section}>
          <Text style={hub.sectionTitle}>Listes partagées</Text>
          {(sharedLists?.length ?? 0) === 0 ? (
            <Text style={hub.empty}>Aucune liste partagée pour l&apos;instant.</Text>
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
                  onPress={() => router.push(`/(app)/lists/${list.id}`)}
                >
                  <View style={hub.listMain}>
                    <View style={hub.listTitleRow}>
                      <Text style={hub.listTitle}>{list.title}</Text>
                      <Text style={hub.sharedBadge}>partagée</Text>
                    </View>
                    <Text style={hub.listMeta}>
                      {list._count.actions} action{list._count.actions !== 1 ? "s" : ""} ·{" "}
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
              placeholder="Ex. Projet maison…"
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
      </ScrollView>
    </SafeAreaView>
  );
}
