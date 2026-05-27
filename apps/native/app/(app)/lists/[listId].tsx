import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";

import { trpc } from "@/lib/trpc";

const DOW_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type Recurrence = "NONE" | "DAILY" | "WEEKLY";

function RecurrenceBadge({ recurrence, dow }: { recurrence: string; dow?: number | null }) {
  if (recurrence === "DAILY") return <Text style={styles.badgeBlue}>quotidien</Text>;
  if (recurrence === "WEEKLY") return <Text style={styles.badgePurple}>hebdo · {dow != null ? DOW_LABELS[dow] : ""}</Text>;
  return null;
}

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const navigation = useNavigation();

  const [title, setTitle] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("NONE");
  const [dueAt, setDueAt] = useState("");
  const [recurrenceTime, setRecurrenceTime] = useState("");
  const [recurrenceDow, setRecurrenceDow] = useState(1);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const utils = trpc.useUtils();

  const { data: actions, isLoading } = trpc.actions.getByList.useQuery(
    { listId: listId! },
    { enabled: !!listId },
  );

  const createAction = trpc.actions.create.useMutation({
    onSuccess: () => {
      utils.actions.getByList.invalidate({ listId: listId! });
      setTitle(""); setDueAt(""); setRecurrenceTime(""); setRecurrence("NONE");
    },
  });

  const toggleAction = trpc.actions.toggle.useMutation({
    onSuccess: () => utils.actions.getByList.invalidate({ listId: listId! }),
  });

  const updateAction = trpc.actions.update.useMutation({
    onSuccess: () => { utils.actions.getByList.invalidate({ listId: listId! }); setEditingId(null); },
  });

  const deleteAction = trpc.actions.delete.useMutation({
    onSuccess: () => utils.actions.getByList.invalidate({ listId: listId! }),
  });

  function handleCreate() {
    if (!title.trim() || !listId) return;
    createAction.mutate({
      listId,
      title,
      recurrence,
      dueAt: recurrence === "NONE" && dueAt ? new Date(dueAt).toISOString() : null,
      recurrenceTime: recurrence !== "NONE" ? recurrenceTime || null : null,
      recurrenceDow: recurrence === "WEEKLY" ? recurrenceDow : null,
    });
  }

  const done = actions?.filter((a) => a.done).length ?? 0;
  const total = actions?.length ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Compteur */}
      {total > 0 && (
        <Text style={styles.counter}>{done} / {total} fait{done > 1 ? "s" : ""}</Text>
      )}

      {/* Formulaire d'ajout */}
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Nouvelle action..."
          placeholderTextColor="#9CA3AF"
          value={title}
          onChangeText={setTitle}
          returnKeyType="done"
        />

        {/* Type récurrence */}
        <View style={styles.radioRow}>
          {(["NONE", "DAILY", "WEEKLY"] as Recurrence[]).map((r) => (
            <Pressable key={r} style={styles.radioItem} onPress={() => setRecurrence(r)}>
              <View style={[styles.radio, recurrence === r && styles.radioActive]} />
              <Text style={styles.radioLabel}>
                {r === "NONE" ? "Ponctuelle" : r === "DAILY" ? "Chaque jour" : "Chaque semaine"}
              </Text>
            </Pressable>
          ))}
        </View>

        {recurrence === "NONE" && (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>À faire le (YYYY-MM-DD)</Text>
            <TextInput style={styles.fieldInput} placeholder="2026-06-01" placeholderTextColor="#9CA3AF" value={dueAt} onChangeText={setDueAt} />
          </View>
        )}
        {recurrence === "DAILY" && (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>À (HH:MM)</Text>
            <TextInput style={styles.fieldInput} placeholder="09:00" placeholderTextColor="#9CA3AF" value={recurrenceTime} onChangeText={setRecurrenceTime} />
          </View>
        )}
        {recurrence === "WEEKLY" && (
          <View>
            <View style={styles.dowRow}>
              {DOW_LABELS.map((d, i) => (
                <Pressable key={i} style={[styles.dowBtn, recurrenceDow === i && styles.dowBtnActive]} onPress={() => setRecurrenceDow(i)}>
                  <Text style={[styles.dowLabel, recurrenceDow === i && styles.dowLabelActive]}>{d}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>À (HH:MM)</Text>
              <TextInput style={styles.fieldInput} placeholder="09:00" placeholderTextColor="#9CA3AF" value={recurrenceTime} onChangeText={setRecurrenceTime} />
            </View>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }, !title.trim() && { opacity: 0.4 }]}
          onPress={handleCreate}
          disabled={!title.trim() || createAction.isPending}
        >
          <Text style={styles.addBtnText}>Ajouter</Text>
        </Pressable>
      </View>

      {/* Liste des actions */}
      {isLoading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
        (actions ?? []).map((action) => (
          <View key={action.id} style={styles.actionCard}>
            {editingId === action.id ? (
              <View style={styles.editForm}>
                <TextInput
                  style={styles.input}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  autoFocus
                />
                <View style={styles.editBtns}>
                  <Pressable
                    style={styles.saveBtnSmall}
                    onPress={() => updateAction.mutate({ actionId: action.id, title: editTitle, recurrence: action.recurrence as Recurrence })}
                  >
                    <Text style={styles.saveBtnText}>Enregistrer</Text>
                  </Pressable>
                  <Pressable style={styles.cancelBtnSmall} onPress={() => setEditingId(null)}>
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.actionRow}>
                <Pressable style={[styles.checkbox, action.done && styles.checkboxDone]} onPress={() => toggleAction.mutate({ actionId: action.id })}>
                  {action.done && <Text style={styles.checkmark}>✓</Text>}
                </Pressable>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, action.done && styles.actionDone]}>{action.title}</Text>
                  <View style={styles.metaRow}>
                    {action.recurrenceTime && <Text style={styles.metaText}>{action.recurrenceTime.slice(0, 5)}</Text>}
                    {action.dueAt && <Text style={styles.metaText}>{new Date(action.dueAt).toLocaleDateString("fr-FR")}</Text>}
                    <RecurrenceBadge recurrence={action.recurrence} dow={action.recurrenceDow} />
                  </View>
                </View>
                <View style={styles.rowBtns}>
                  <Pressable onPress={() => { setEditingId(action.id); setEditTitle(action.title); }}>
                    <Text style={styles.editIcon}>✏️</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteAction.mutate({ actionId: action.id })}>
                    <Text style={styles.deleteIcon}>🗑</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ))
      )}
      {!isLoading && (actions?.length ?? 0) === 0 && (
        <Text style={styles.empty}>Aucune action dans cette liste.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 16, paddingBottom: 40 },
  counter: { fontSize: 13, color: "#9CA3AF", marginBottom: 12, textAlign: "right" },
  card: { backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", padding: 14, marginBottom: 20 },
  input: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111827", marginBottom: 12 },
  radioRow: { flexDirection: "row", gap: 16, marginBottom: 12 },
  radioItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#D1D5DB" },
  radioActive: { borderColor: "#111827", backgroundColor: "#111827" },
  radioLabel: { fontSize: 13, color: "#374151" },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  fieldLabel: { fontSize: 13, color: "#6B7280", minWidth: 80 },
  fieldInput: { flex: 1, borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: "#111827" },
  dowRow: { flexDirection: "row", gap: 4, marginBottom: 10, flexWrap: "wrap" },
  dowBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: "#E5E7EB" },
  dowBtnActive: { backgroundColor: "#111827", borderColor: "#111827" },
  dowLabel: { fontSize: 12, color: "#374151" },
  dowLabelActive: { color: "#fff" },
  addBtn: { backgroundColor: "#111827", borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 4 },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  actionCard: { backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", padding: 12, marginBottom: 8 },
  actionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center", marginTop: 2, flexShrink: 0 },
  checkboxDone: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  checkmark: { color: "#fff", fontSize: 11, fontWeight: "700" },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 14, color: "#111827" },
  actionDone: { textDecorationLine: "line-through", color: "#9CA3AF" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" },
  metaText: { fontSize: 11, color: "#9CA3AF" },
  badgeBlue: { fontSize: 11, color: "#2563EB", backgroundColor: "#EFF6FF", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgePurple: { fontSize: 11, color: "#7C3AED", backgroundColor: "#F5F3FF", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  rowBtns: { flexDirection: "row", gap: 8, flexShrink: 0 },
  editIcon: { fontSize: 16 },
  deleteIcon: { fontSize: 16 },
  editForm: { gap: 8 },
  editBtns: { flexDirection: "row", gap: 8 },
  saveBtnSmall: { flex: 1, backgroundColor: "#111827", borderRadius: 6, paddingVertical: 8, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  cancelBtnSmall: { flex: 1, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 6, paddingVertical: 8, alignItems: "center" },
  cancelBtnText: { color: "#6B7280", fontSize: 13 },
  empty: { fontSize: 13, color: "#9CA3AF", fontStyle: "italic", textAlign: "center", marginTop: 20 },
});
