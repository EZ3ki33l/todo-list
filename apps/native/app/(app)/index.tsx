import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { TabListHeader } from "@/components/tab-list-header";
import { listHubStyles as hub } from "@/lib/list-hub-styles";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";

export default function DashboardScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [newTitle, setNewTitle] = useState("");
  const [showSection, setShowSection] = useState<"ARCHIVED" | "DONE" | null>(null);

  const utils = trpc.useUtils();

  const { data: todayActions, isLoading: loadingToday } = trpc.actions.getToday.useQuery();
  const { data: weekActions } = trpc.actions.getWeek.useQuery();
  const { data: lists, isLoading: loadingLists, refetch } = trpc.lists.getAll.useQuery();

  useFocusEffect(
    useCallback(() => {
      void utils.lists.getAll.invalidate();
      void utils.actions.getToday.invalidate();
      void utils.actions.getWeek.invalidate();
    }, [utils]),
  );

  const createList = trpc.lists.create.useMutation({
    onSuccess: () => { utils.lists.getAll.invalidate(); setNewTitle(""); },
  });

  const updateStatus = trpc.lists.updateStatus.useMutation({
    onSuccess: () => utils.lists.getAll.invalidate(),
  });

  const deleteList = trpc.lists.delete.useMutation({
    onMutate: async ({ listId }) => {
      await utils.lists.getAll.cancel();
      const previous = utils.lists.getAll.getData();
      utils.lists.getAll.setData(
        undefined,
        (old) => old?.filter((l) => l.id !== listId),
      );
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) {
        utils.lists.getAll.setData(undefined, ctx.previous);
      }
      Alert.alert("Erreur", "Impossible de supprimer la liste. Réessayez.");
    },
    onSettled: async () => {
      await utils.lists.getAll.invalidate();
      await refetch();
    },
  });

  function confirmDeleteList(listId: string, title: string) {
    Alert.alert(
      "Supprimer cette liste ?",
      `« ${title} » sera supprimée définitivement.`,
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

  const toggleAction = trpc.actions.toggle.useMutation({
    onSuccess: (result) => {
      void utils.actions.getToday.invalidate();
      void utils.actions.getWeek.invalidate();
      void utils.lists.getAll.invalidate();
      if (result.listClosed) {
        Alert.alert(
          "Liste terminée",
          "Toutes les tâches ponctuelles sont faites. La liste est passée en « terminée ».",
        );
      } else if (result.listDayComplete) {
        Alert.alert("Bravo !", "Toutes les tâches du jour sont réalisées.");
      }
    },
  });

  const activeLists = lists?.filter((l) => l.status === "ACTIVE") ?? [];
  const archivedLists = lists?.filter((l) => l.status === "ARCHIVED") ?? [];
  const doneLists = lists?.filter((l) => l.status === "DONE") ?? [];

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return (
    <SafeAreaView style={hub.safe} edges={["top"]}>
    <ScrollView
      style={hub.container}
      contentContainerStyle={hub.content}
      refreshControl={<RefreshControl refreshing={loadingLists} onRefresh={refetch} />}
    >
      <TabListHeader title="Mes listes" onSignOut={signOut} />

      {/* Vue aujourd'hui / semaine */}
      {(todayActions?.length ?? 0) > 0 || (weekActions?.length ?? 0) > 0 ? (
        <View style={hub.section}>
          <View style={styles.dayWeekGrid}>
            {/* Aujourd'hui */}
            <View style={styles.dayWeekCol}>
              <Text style={hub.sectionTitle}>
                Aujourd'hui{" "}
                <Text style={styles.sectionSub}>
                  {now.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                </Text>
              </Text>
              {loadingToday ? <ActivityIndicator /> : (todayActions ?? []).map((a) => (
                <Pressable
                  key={a.id}
                  style={styles.actionRow}
                  onPress={() => toggleAction.mutate({ actionId: a.id })}
                >
                  <View style={[styles.checkbox, a.done && styles.checkboxDone]}>
                    {a.done && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.actionTitle, a.done && styles.actionDone]} numberOfLines={1}>
                    {a.title}
                  </Text>
                </Pressable>
              ))}
              {!loadingToday && (todayActions?.length ?? 0) === 0 && (
                <Text style={hub.empty}>Rien de prévu.</Text>
              )}
            </View>

            {/* Cette semaine */}
            <View style={styles.dayWeekCol}>
              <Text style={hub.sectionTitle}>
                Semaine{" "}
                <Text style={styles.sectionSub}>
                  jusqu'au {weekEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </Text>
              </Text>
              {(weekActions ?? []).map((a) => (
                <Pressable
                  key={a.id}
                  style={styles.actionRow}
                  onPress={() => toggleAction.mutate({ actionId: a.id })}
                >
                  <View style={[styles.checkbox, a.done && styles.checkboxDone]}>
                    {a.done && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.actionTitle, a.done && styles.actionDone]} numberOfLines={1}>
                    {a.title}
                  </Text>
                </Pressable>
              ))}
              {(weekActions?.length ?? 0) === 0 && (
                <Text style={hub.empty}>Rien de prévu.</Text>
              )}
            </View>
          </View>
        </View>
      ) : null}

      {/* Créer une liste */}
      <View style={hub.section}>
        <View style={hub.createRow}>
          <TextInput
            style={hub.input}
            placeholder="Nouvelle liste..."
            placeholderTextColor="#9CA3AF"
            value={newTitle}
            onChangeText={setNewTitle}
            onSubmitEditing={() => { if (newTitle.trim()) createList.mutate({ title: newTitle }); }}
            returnKeyType="done"
          />
          <Pressable
            style={({ pressed }) => [hub.createBtn, pressed && { opacity: 0.8 }, !newTitle.trim() && { opacity: 0.4 }]}
            onPress={() => { if (newTitle.trim()) createList.mutate({ title: newTitle }); }}
            disabled={!newTitle.trim() || createList.isPending}
          >
            <Text style={hub.createBtnText}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* Listes actives */}
      <View style={hub.section}>
        <Text style={hub.sectionTitle}>En cours <Text style={hub.count}>({activeLists.length})</Text></Text>
        {activeLists.map((list) => (
          <View key={list.id} style={hub.listCard}>
            <Pressable style={hub.listMain} onPress={() => router.push(`/(app)/lists/${list.id}`)}>
              <Text style={hub.listTitle}>{list.title}</Text>
              <Text style={hub.listMeta}>{list._count.actions} action{list._count.actions !== 1 ? "s" : ""}</Text>
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
        ))}
        {activeLists.length === 0 && <Text style={hub.empty}>Aucune liste en cours.</Text>}
      </View>

      {/* Archivées */}
      <Pressable onPress={() => setShowSection(showSection === "ARCHIVED" ? null : "ARCHIVED")} style={hub.collapseHeader}>
        <Text style={hub.sectionTitle}>
          {showSection === "ARCHIVED" ? "▾" : "▸"} Archivées <Text style={hub.count}>({archivedLists.length})</Text>
        </Text>
      </Pressable>
      {showSection === "ARCHIVED" && archivedLists.map((list) => (
        <View key={list.id} style={hub.listCard}>
          <Pressable style={hub.listMain} onPress={() => router.push(`/(app)/lists/${list.id}`)}>
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

      {/* Terminées */}
      <Pressable onPress={() => setShowSection(showSection === "DONE" ? null : "DONE")} style={hub.collapseHeader}>
        <Text style={hub.sectionTitle}>
          {showSection === "DONE" ? "▾" : "▸"} Terminées <Text style={hub.count}>({doneLists.length})</Text>
        </Text>
      </Pressable>
      {showSection === "DONE" && doneLists.map((list) => (
        <View key={list.id} style={hub.listCard}>
          <Pressable style={hub.listMain} onPress={() => router.push(`/(app)/lists/${list.id}`)}>
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

const styles = StyleSheet.create({
  dayWeekGrid: { flexDirection: "row", gap: 12 },
  dayWeekCol: { flex: 1 },
  sectionSub: { fontSize: 12, fontWeight: "400", color: "#9CA3AF" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 2, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center" },
  checkboxDone: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  checkmark: { color: "#fff", fontSize: 10, fontWeight: "700" },
  actionTitle: { flex: 1, fontSize: 13, color: "#374151" },
  actionDone: { textDecorationLine: "line-through", color: "#9CA3AF" },
});
