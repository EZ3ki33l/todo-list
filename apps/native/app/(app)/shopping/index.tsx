import { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { TabListHeader } from "@/components/tab-list-header";
import { useAuth } from "@/lib/auth-context";
import { listHubStyles as hub } from "@/lib/list-hub-styles";
import { trpc } from "@/lib/trpc";

export default function ShoppingListsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [newTitle, setNewTitle] = useState("");
  const [showSection, setShowSection] = useState<"ARCHIVED" | "DONE" | null>(null);

  const utils = trpc.useUtils();
  const { data: lists, isLoading, refetch } = trpc.shoppingLists.getAll.useQuery();

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
    onSuccess: () => utils.shoppingLists.getAll.invalidate(),
  });

  const activeLists = lists?.filter((l) => l.status === "ACTIVE") ?? [];
  const archivedLists = lists?.filter((l) => l.status === "ARCHIVED") ?? [];
  const doneLists = lists?.filter((l) => l.status === "DONE") ?? [];

  return (
    <SafeAreaView style={hub.safe} edges={["top"]}>
      <ScrollView
        style={hub.container}
        contentContainerStyle={hub.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <TabListHeader title="Mes courses" onSignOut={signOut} />

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
          {activeLists.map((list) => (
            <View key={list.id} style={hub.listCard}>
              <Pressable
                style={hub.listMain}
                onPress={() => router.push(`/(app)/shopping/${list.id}`)}
              >
                <Text style={hub.listTitle}>{list.title}</Text>
                <Text style={hub.listMeta}>
                  {list._count.items} article{list._count.items !== 1 ? "s" : ""}
                </Text>
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
                <Pressable onPress={() => deleteList.mutate({ listId: list.id })}>
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
