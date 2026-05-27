import { useCallback, useState } from "react";
import {
  ActivityIndicator,
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
    onSuccess: () => utils.lists.getAll.invalidate(),
  });

  const toggleAction = trpc.actions.toggle.useMutation({
    onSuccess: () => { utils.actions.getToday.invalidate(); utils.actions.getWeek.invalidate(); },
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
              <Pressable onPress={() => deleteList.mutate({ listId: list.id })}>
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
            <Pressable onPress={() => deleteList.mutate({ listId: list.id })}>
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
            <Pressable onPress={() => deleteList.mutate({ listId: list.id })}>
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
