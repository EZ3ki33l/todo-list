import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AddActionForm } from "@/components/add-action-form";
import { DayWeekView } from "@/components/day-week-view";
import { SharedListRow } from "@/components/shared-list-row";
import { TodoHubSkeleton } from "@/components/todo-hub-skeleton";
import { TabListHeader } from "@/components/tab-list-header";
import { getListHubStyles } from "@/lib/list-hub-styles";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";
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
    return memberCount > 0 ? "Vous êtes propriétaire" : "Ouvrez la liste → Partager";
  }
  return `Avec ${ownerName ?? ownerEmail ?? "quelqu'un"}`;
}

export default function DashboardScreen() {
  const { signOut, user } = useAuth();
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
  } = usePersonalTodoList();

  const actionsQuery = trpc.actions.getByList.useQuery(
    { listId: personalList?.id ?? "" },
    { enabled: !!personalList?.id, staleTime: 15_000 },
  );

  const showSkeleton =
    (loadingPersonal && !personalList) ||
    (!!personalList?.id && actionsQuery.isLoading && actionsQuery.data === undefined);

  const { data: sharedListsPrimary, isError: sharedError, refetch: refetchShared } =
    trpc.lists.getSharedTodos.useQuery(undefined, {
      enabled: !!personalList && !showSkeleton,
      retry: 1,
    });

  const { data: allLists } = trpc.lists.getAll.useQuery(undefined, {
    enabled: !!personalList && sharedError && !showSkeleton,
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

  async function handleRefresh() {
    setPullRefreshing(true);
    try {
      await Promise.all([refetchPersonal(), refetchShared()]);
    } finally {
      setPullRefreshing(false);
    }
  }

  return (
    <SafeAreaView style={hub.safe} edges={["top"]}>
      <ScrollView
        style={hub.container}
        contentContainerStyle={hub.content}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={() => void handleRefresh()}
          />
        }
      >
        <TabListHeader title="Tâches" onSignOut={signOut} />

        {showSkeleton ? (
          <TodoHubSkeleton />
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

        {!showSkeleton ? (
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
                <SharedListRow
                  key={list.id}
                  kind="todo"
                  listId={list.id}
                  title={list.title}
                  subtitle={`${list._count.actions} action${list._count.actions !== 1 ? "s" : ""} · ${ownerSubtitle(
                    isOwner,
                    list._count.members,
                    owner?.name,
                    owner?.email,
                  )}`}
                  isOwner={isOwner}
                  href={`/(app)/lists/${list.id}`}
                  palette={palette}
                />
              );
            })
          )}

          <View style={[hub.createRow, { marginTop: 12 }]}>
            <TextInput
              style={hub.input}
              placeholder="Ex. Projet maison…"
              placeholderTextColor={palette.textSubtle}
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
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
