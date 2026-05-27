import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";

type ListStatus = "ACTIVE" | "ARCHIVED" | "DONE";

const STATUS_LABELS: Record<ListStatus, string> = {
  ACTIVE: "En cours",
  ARCHIVED: "Archivées",
  DONE: "Terminées",
};

export default function DashboardScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [newTitle, setNewTitle] = useState("");
  const [showSection, setShowSection] = useState<"ARCHIVED" | "DONE" | null>(null);

  const utils = trpc.useUtils();

  const { data: todayActions, isLoading: loadingToday } = trpc.actions.getToday.useQuery();
  const { data: weekActions } = trpc.actions.getWeek.useQuery();
  const { data: lists, isLoading: loadingLists, refetch } = trpc.lists.getAll.useQuery();

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loadingLists} onRefresh={refetch} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Mes listes</Text>
        <Pressable onPress={signOut}>
          <Text style={styles.signOut}>Déconnexion</Text>
        </Pressable>
      </View>

      {/* Vue aujourd'hui / semaine */}
      {(todayActions?.length ?? 0) > 0 || (weekActions?.length ?? 0) > 0 ? (
        <View style={styles.section}>
          <View style={styles.dayWeekGrid}>
            {/* Aujourd'hui */}
            <View style={styles.dayWeekCol}>
              <Text style={styles.sectionTitle}>
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
                <Text style={styles.empty}>Rien de prévu.</Text>
              )}
            </View>

            {/* Cette semaine */}
            <View style={styles.dayWeekCol}>
              <Text style={styles.sectionTitle}>
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
                <Text style={styles.empty}>Rien de prévu.</Text>
              )}
            </View>
          </View>
        </View>
      ) : null}

      {/* Créer une liste */}
      <View style={styles.section}>
        <View style={styles.createRow}>
          <TextInput
            style={styles.input}
            placeholder="Nouvelle liste..."
            placeholderTextColor="#9CA3AF"
            value={newTitle}
            onChangeText={setNewTitle}
            onSubmitEditing={() => { if (newTitle.trim()) createList.mutate({ title: newTitle }); }}
            returnKeyType="done"
          />
          <Pressable
            style={({ pressed }) => [styles.createBtn, pressed && { opacity: 0.8 }, !newTitle.trim() && { opacity: 0.4 }]}
            onPress={() => { if (newTitle.trim()) createList.mutate({ title: newTitle }); }}
            disabled={!newTitle.trim() || createList.isPending}
          >
            <Text style={styles.createBtnText}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* Listes actives */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>En cours <Text style={styles.count}>({activeLists.length})</Text></Text>
        {activeLists.map((list) => (
          <View key={list.id} style={styles.listCard}>
            <Pressable style={styles.listMain} onPress={() => router.push(`/(app)/lists/${list.id}`)}>
              <Text style={styles.listTitle}>{list.title}</Text>
              <Text style={styles.listMeta}>{list._count.actions} action{list._count.actions !== 1 ? "s" : ""}</Text>
            </Pressable>
            <View style={styles.listActions}>
              <Pressable onPress={() => updateStatus.mutate({ listId: list.id, status: "DONE" })}>
                <Text style={styles.actionBtnGreen}>✓</Text>
              </Pressable>
              <Pressable onPress={() => updateStatus.mutate({ listId: list.id, status: "ARCHIVED" })}>
                <Text style={styles.actionBtnGray}>⊟</Text>
              </Pressable>
              <Pressable onPress={() => deleteList.mutate({ listId: list.id })}>
                <Text style={styles.actionBtnRed}>✕</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {activeLists.length === 0 && <Text style={styles.empty}>Aucune liste en cours.</Text>}
      </View>

      {/* Archivées */}
      <Pressable onPress={() => setShowSection(showSection === "ARCHIVED" ? null : "ARCHIVED")} style={styles.collapseHeader}>
        <Text style={styles.sectionTitle}>
          {showSection === "ARCHIVED" ? "▾" : "▸"} Archivées <Text style={styles.count}>({archivedLists.length})</Text>
        </Text>
      </Pressable>
      {showSection === "ARCHIVED" && archivedLists.map((list) => (
        <View key={list.id} style={styles.listCard}>
          <Pressable style={styles.listMain} onPress={() => router.push(`/(app)/lists/${list.id}`)}>
            <Text style={styles.listTitle}>{list.title}</Text>
          </Pressable>
          <View style={styles.listActions}>
            <Pressable onPress={() => updateStatus.mutate({ listId: list.id, status: "ACTIVE" })}>
              <Text style={styles.actionBtnGreen}>↩</Text>
            </Pressable>
            <Pressable onPress={() => deleteList.mutate({ listId: list.id })}>
              <Text style={styles.actionBtnRed}>✕</Text>
            </Pressable>
          </View>
        </View>
      ))}

      {/* Terminées */}
      <Pressable onPress={() => setShowSection(showSection === "DONE" ? null : "DONE")} style={styles.collapseHeader}>
        <Text style={styles.sectionTitle}>
          {showSection === "DONE" ? "▾" : "▸"} Terminées <Text style={styles.count}>({doneLists.length})</Text>
        </Text>
      </Pressable>
      {showSection === "DONE" && doneLists.map((list) => (
        <View key={list.id} style={styles.listCard}>
          <Pressable style={styles.listMain} onPress={() => router.push(`/(app)/lists/${list.id}`)}>
            <Text style={styles.listTitle}>{list.title}</Text>
          </Pressable>
          <View style={styles.listActions}>
            <Pressable onPress={() => updateStatus.mutate({ listId: list.id, status: "ACTIVE" })}>
              <Text style={styles.actionBtnGreen}>↩</Text>
            </Pressable>
            <Pressable onPress={() => deleteList.mutate({ listId: list.id })}>
              <Text style={styles.actionBtnRed}>✕</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  screenTitle: { fontSize: 24, fontWeight: "700", color: "#111827" },
  signOut: { fontSize: 13, color: "#6B7280" },
  section: { marginBottom: 20 },
  dayWeekGrid: { flexDirection: "row", gap: 12 },
  dayWeekCol: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 8 },
  sectionSub: { fontSize: 12, fontWeight: "400", color: "#9CA3AF" },
  count: { fontWeight: "400", color: "#9CA3AF" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 2, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center" },
  checkboxDone: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  checkmark: { color: "#fff", fontSize: 10, fontWeight: "700" },
  actionTitle: { flex: 1, fontSize: 13, color: "#374151" },
  actionDone: { textDecorationLine: "line-through", color: "#9CA3AF" },
  empty: { fontSize: 13, color: "#9CA3AF", fontStyle: "italic" },
  createRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: "#fff", color: "#111827" },
  createBtn: { backgroundColor: "#111827", borderRadius: 8, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  createBtnText: { color: "#fff", fontSize: 20, fontWeight: "600" },
  listCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8 },
  listMain: { flex: 1 },
  listTitle: { fontSize: 14, fontWeight: "500", color: "#111827" },
  listMeta: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  listActions: { flexDirection: "row", gap: 12, marginLeft: 8 },
  actionBtnGreen: { fontSize: 16, color: "#16A34A" },
  actionBtnGray: { fontSize: 16, color: "#6B7280" },
  actionBtnRed: { fontSize: 14, color: "#DC2626" },
  collapseHeader: { marginBottom: 8 },
});
