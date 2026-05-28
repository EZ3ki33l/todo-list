import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import DraggableFlatList, { type RenderItemParams } from "react-native-draggable-flatlist";
import { useLocalSearchParams } from "expo-router";

import { applyListOrder } from "@/lib/reorder-list";
import { trpc } from "@/lib/trpc";

const DOW_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type Recurrence = "NONE" | "DAILY" | "WEEKLY";

function formatDateFr(d: Date) {
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime24(d: Date) {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function RecurrenceBadge({ recurrence, dow }: { recurrence: string; dow?: number | null }) {
  if (recurrence === "DAILY") return <Text style={styles.badgeBlue}>quotidien</Text>;
  if (recurrence === "WEEKLY") {
    return (
      <Text style={styles.badgePurple}>
        hebdo · {dow != null ? DOW_LABELS[dow] : ""}
      </Text>
    );
  }
  return null;
}

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();

  const [title, setTitle] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("NONE");
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [recurrenceTime, setRecurrenceTime] = useState<Date | null>(null);
  const [recurrenceDow, setRecurrenceDow] = useState(1);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const utils = trpc.useUtils();

  const { data: actions, isLoading } = trpc.actions.getByList.useQuery(
    { listId: listId! },
    { enabled: !!listId },
  );

  type ActionRow = NonNullable<typeof actions>[number];
  const actionRows = actions ?? [];
  const [orderOverride, setOrderOverride] = useState<ActionRow[] | null>(null);
  const listData = orderOverride ?? actionRows;

  const actionIdsKey = useMemo(
    () => actionRows.map((a) => a.id).sort().join(","),
    [actionRows],
  );
  useEffect(() => {
    setOrderOverride(null);
  }, [actionIdsKey]);

  const createAction = trpc.actions.create.useMutation({
    onSuccess: () => {
      utils.actions.invalidate();
      utils.lists.getAll.invalidate();
      setTitle("");
      setDueAt(null);
      setRecurrenceTime(null);
      setRecurrence("NONE");
    },
  });

  const toggleAction = trpc.actions.toggle.useMutation({
    onSuccess: () => utils.actions.invalidate(),
  });

  const updateAction = trpc.actions.update.useMutation({
    onSuccess: () => {
      utils.actions.invalidate();
      setEditingId(null);
    },
  });

  const deleteAction = trpc.actions.delete.useMutation({
    onSuccess: () => {
      utils.actions.invalidate();
      utils.lists.getAll.invalidate();
    },
  });

  const reorderActions = trpc.actions.reorder.useMutation({
    onSuccess: (_result, { listId: lid, orderedIds }) => {
      utils.actions.getByList.setData({ listId: lid }, (old) =>
        old ? applyListOrder(old, orderedIds) : old,
      );
      setOrderOverride(null);
    },
    onError: (_err, input) => {
      setOrderOverride(null);
      void utils.actions.getByList.invalidate({ listId: input.listId });
    },
  });

  const handleDragEnd = useCallback(
    ({ data }: { data: ActionRow[] }) => {
      if (!listId) return;
      setOrderOverride(data);
      reorderActions.mutate({ listId, orderedIds: data.map((a) => a.id) });
    },
    [listId, reorderActions],
  );

  function handleCreate() {
    if (!title.trim() || !listId) return;
    createAction.mutate({
      listId,
      title,
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

  const done = actions?.filter((a) => a.done).length ?? 0;
  const total = actions?.length ?? 0;
  const dragEnabled = !editingId;

  const listHeader = useMemo(
    () => (
      <View>
        {total > 0 && (
          <>
            <Text style={styles.counter}>
              {done} / {total} fait{done > 1 ? "s" : ""}
            </Text>
            {total > 1 && (
              <Text style={styles.dragHint}>Maintenir une ligne pour réordonner</Text>
            )}
          </>
        )}

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Nouvelle action..."
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
          />

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
              <Text style={styles.fieldLabel}>À faire le</Text>
              <Pressable style={styles.fieldInput} onPress={() => setShowDatePicker(true)}>
                <Text style={[styles.fieldText, !dueAt && styles.fieldTextPlaceholder]}>
                  {dueAt ? formatDateFr(dueAt) : "Choisir une date"}
                </Text>
              </Pressable>
            </View>
          )}
          {recurrence === "DAILY" && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>À</Text>
              <Pressable style={styles.fieldInput} onPress={() => setShowTimePicker(true)}>
                <Text
                  style={[styles.fieldText, !recurrenceTime && styles.fieldTextPlaceholder]}
                >
                  {recurrenceTime ? formatTime24(recurrenceTime) : "Choisir une heure"}
                </Text>
              </Pressable>
            </View>
          )}
          {recurrence === "WEEKLY" && (
            <View>
              <View style={styles.dowRow}>
                {DOW_LABELS.map((d, i) => (
                  <Pressable
                    key={i}
                    style={[styles.dowBtn, recurrenceDow === i && styles.dowBtnActive]}
                    onPress={() => setRecurrenceDow(i)}
                  >
                    <Text style={[styles.dowLabel, recurrenceDow === i && styles.dowLabelActive]}>
                      {d}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>À</Text>
                <Pressable style={styles.fieldInput} onPress={() => setShowTimePicker(true)}>
                  <Text
                    style={[styles.fieldText, !recurrenceTime && styles.fieldTextPlaceholder]}
                  >
                    {recurrenceTime ? formatTime24(recurrenceTime) : "Choisir une heure"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {showDatePicker && (
            <DateTimePicker
              value={dueAt ?? new Date()}
              mode="date"
              onChange={handleDateChange}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={recurrenceTime ?? new Date()}
              mode="time"
              is24Hour
              onChange={handleTimeChange}
            />
          )}

          <Pressable
            style={({ pressed }) => [
              styles.addBtn,
              pressed && { opacity: 0.8 },
              !title.trim() && { opacity: 0.4 },
            ]}
            onPress={handleCreate}
            disabled={!title.trim() || createAction.isPending}
          >
            <Text style={styles.addBtnText}>Ajouter</Text>
          </Pressable>
        </View>

        {isLoading && <ActivityIndicator style={{ marginTop: 20 }} />}
      </View>
    ),
    [
      total,
      done,
      title,
      recurrence,
      dueAt,
      recurrenceTime,
      recurrenceDow,
      showDatePicker,
      showTimePicker,
      isLoading,
      createAction.isPending,
    ],
  );

  const renderAction = useCallback(
    ({ item, drag, isActive }: RenderItemParams<ActionRow>) => (
        <View style={[styles.actionCard, isActive && styles.actionCardDragging]}>
          {editingId === item.id ? (
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
                  onPress={() =>
                    updateAction.mutate({
                      actionId: item.id,
                      title: editTitle,
                      recurrence: item.recurrence as Recurrence,
                    })
                  }
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
                <Pressable
                  onLongPress={dragEnabled ? drag : undefined}
                  delayLongPress={120}
                  disabled={!dragEnabled || isActive}
                  hitSlop={8}
                  style={styles.dragHandleBtn}
                >
                  <Text style={styles.dragHandle}>⠿</Text>
                </Pressable>
                <Pressable
                  style={[styles.checkbox, item.done && styles.checkboxDone]}
                  onPress={() => toggleAction.mutate({ actionId: item.id })}
                >
                  {item.done && <Text style={styles.checkmark}>✓</Text>}
                </Pressable>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, item.done && styles.actionDone]}>
                    {item.title}
                  </Text>
                  <View style={styles.metaRow}>
                    {item.recurrenceTime && (
                      <Text style={styles.metaText}>{item.recurrenceTime.slice(0, 5)}</Text>
                    )}
                    {item.dueAt && (
                      <Text style={styles.metaText}>
                        {new Date(item.dueAt).toLocaleDateString("fr-FR")}
                      </Text>
                    )}
                    <RecurrenceBadge recurrence={item.recurrence} dow={item.recurrenceDow} />
                  </View>
                </View>
                <View style={styles.rowBtns}>
                  <Pressable
                    onPress={() => {
                      setEditingId(item.id);
                      setEditTitle(item.title);
                    }}
                  >
                    <Text style={styles.editIcon}>✏️</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteAction.mutate({ actionId: item.id })}>
                    <Text style={styles.deleteIcon}>🗑</Text>
                  </Pressable>
                </View>
              </View>
          )}
        </View>
    ),
    [
      editingId,
      editTitle,
      dragEnabled,
      updateAction,
      toggleAction,
      deleteAction,
    ],
  );

  return (
    <DraggableFlatList
      data={listData}
      keyExtractor={(item) => item.id}
      onDragEnd={handleDragEnd}
      activationDistance={12}
      enableLayoutAnimationExperimental={false}
      renderItem={renderAction}
      ListHeaderComponent={listHeader}
      ListFooterComponent={
        !isLoading && listData.length === 0 ? (
          <Text style={styles.empty}>Aucune action dans cette liste.</Text>
        ) : null
      }
      containerStyle={styles.container}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 16, paddingBottom: 40 },
  counter: { fontSize: 13, color: "#9CA3AF", marginBottom: 4, textAlign: "right" },
  dragHint: { fontSize: 12, color: "#9CA3AF", marginBottom: 12, textAlign: "right" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    marginBottom: 12,
  },
  radioRow: { flexDirection: "row", gap: 16, marginBottom: 12 },
  radioItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#D1D5DB" },
  radioActive: { borderColor: "#111827", backgroundColor: "#111827" },
  radioLabel: { fontSize: 13, color: "#374151" },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  fieldLabel: { fontSize: 13, color: "#6B7280", minWidth: 80 },
  fieldInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
    justifyContent: "center",
    minHeight: 36,
  },
  fieldText: { fontSize: 13, color: "#111827" },
  fieldTextPlaceholder: { color: "#9CA3AF" },
  dowRow: { flexDirection: "row", gap: 4, marginBottom: 10, flexWrap: "wrap" },
  dowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dowBtnActive: { backgroundColor: "#111827", borderColor: "#111827" },
  dowLabel: { fontSize: 12, color: "#374151" },
  dowLabelActive: { color: "#fff" },
  addBtn: {
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  actionCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 8,
  },
  actionCardDragging: {
    borderColor: "#111827",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  actionRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  dragHandleBtn: { paddingVertical: 2, paddingRight: 4 },
  dragHandle: { fontSize: 16, color: "#D1D5DB", width: 14, textAlign: "center" },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxDone: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  checkmark: { color: "#fff", fontSize: 11, fontWeight: "700" },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 14, color: "#111827" },
  actionDone: { textDecorationLine: "line-through", color: "#9CA3AF" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" },
  metaText: { fontSize: 11, color: "#9CA3AF" },
  badgeBlue: {
    fontSize: 11,
    color: "#2563EB",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePurple: {
    fontSize: 11,
    color: "#7C3AED",
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rowBtns: { flexDirection: "row", gap: 8, flexShrink: 0 },
  editIcon: { fontSize: 16 },
  deleteIcon: { fontSize: 16 },
  editForm: { gap: 8 },
  editBtns: { flexDirection: "row", gap: 8 },
  saveBtnSmall: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  cancelBtnSmall: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
  },
  cancelBtnText: { color: "#6B7280", fontSize: 13 },
  empty: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },
});
