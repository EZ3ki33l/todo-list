import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";

import { trpc } from "@/lib/trpc";

const DOW_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
type Recurrence = "NONE" | "DAILY" | "WEEKLY";

function formatTime24(d: Date) {
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function AddActionForm({ listId }: { listId: string }) {
  const [title, setTitle] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("NONE");
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [recurrenceTime, setRecurrenceTime] = useState<Date | null>(null);
  const [recurrenceDow, setRecurrenceDow] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const utils = trpc.useUtils();

  const createAction = trpc.actions.create.useMutation({
    onSuccess: () => {
      void utils.actions.getByList.invalidate({ listId });
      setTitle("");
      setDueAt(null);
      setRecurrenceTime(null);
      setRecurrence("NONE");
    },
  });

  function handleCreate() {
    if (!title.trim()) return;
    createAction.mutate({
      listId,
      title: title.trim(),
      recurrence,
      dueAt: recurrence === "NONE" && dueAt ? dueAt.toISOString() : null,
      recurrenceTime:
        recurrence !== "NONE" && recurrenceTime ? formatTime24(recurrenceTime) : null,
      recurrenceDow: recurrence === "WEEKLY" ? recurrenceDow : null,
    });
  }

  function handleDateChange(event: DateTimePickerEvent, d?: Date) {
    setShowDatePicker(false);
    if (event.type === "set" && d) setDueAt(d);
  }

  function handleTimeChange(event: DateTimePickerEvent, d?: Date) {
    setShowTimePicker(false);
    if (event.type === "set" && d) setRecurrenceTime(d);
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Nouvelle action..."
          placeholderTextColor="#9CA3AF"
          value={title}
          onChangeText={setTitle}
          returnKeyType="done"
          onSubmitEditing={handleCreate}
        />
        <Pressable
          style={[styles.addBtn, !title.trim() && styles.addBtnDisabled]}
          onPress={handleCreate}
          disabled={!title.trim() || createAction.isPending}
        >
          <Text style={styles.addBtnText}>Ajouter</Text>
        </Pressable>
      </View>

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
        <Pressable style={styles.fieldBtn} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.fieldLabel}>À faire le</Text>
          <Text style={styles.fieldValue}>
            {dueAt
              ? dueAt.toLocaleDateString("fr-FR")
              : "Choisir une date"}
          </Text>
        </Pressable>
      )}

      {recurrence === "DAILY" && (
        <Pressable style={styles.fieldBtn} onPress={() => setShowTimePicker(true)}>
          <Text style={styles.fieldLabel}>À</Text>
          <Text style={styles.fieldValue}>
            {recurrenceTime ? formatTime24(recurrenceTime) : "Choisir une heure"}
          </Text>
        </Pressable>
      )}

      {recurrence === "WEEKLY" && (
        <View>
          <View style={styles.dowRow}>
            {DOW_LABELS.map((d, i) => (
              <Pressable
                key={d}
                style={[styles.dowBtn, recurrenceDow === i && styles.dowBtnActive]}
                onPress={() => setRecurrenceDow(i)}
              >
                <Text style={[styles.dowLabel, recurrenceDow === i && styles.dowLabelActive]}>
                  {d}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.fieldBtn} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.fieldLabel}>À</Text>
            <Text style={styles.fieldValue}>
              {recurrenceTime ? formatTime24(recurrenceTime) : "Choisir une heure"}
            </Text>
          </Pressable>
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker value={dueAt ?? new Date()} mode="date" onChange={handleDateChange} />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={recurrenceTime ?? new Date()}
          mode="time"
          is24Hour
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  row: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  addBtn: {
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  radioRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  radioItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#D1D5DB" },
  radioActive: { borderColor: "#111827", backgroundColor: "#111827" },
  radioLabel: { fontSize: 13, color: "#374151" },
  fieldBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  fieldLabel: { fontSize: 13, color: "#6B7280" },
  fieldValue: { fontSize: 13, color: "#111827" },
  dowRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 8 },
  dowBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dowBtnActive: { backgroundColor: "#111827", borderColor: "#111827" },
  dowLabel: { fontSize: 12, color: "#374151" },
  dowLabelActive: { color: "#fff" },
});
