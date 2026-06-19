import { useState } from "react";
import { Alert, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";

import { AddActionDetailModal } from "@/components/add-action-detail-modal";
import { scheduleActionLocalReminder } from "@/lib/action-local-reminder";
import {
  emptyActionDetailDraft,
  toActionMutationFields,
  toLocalDateInput,
  validateActionSchedule,
  type ActionDetailDraft,
} from "@repo/api/lib/action-form";
import type { ActionFormValues, RecurrenceKind } from "@repo/api/lib/action-form";
import { trpc } from "@/lib/trpc";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

const DOW_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function formatTime24(d: Date) {
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function buildScheduleValues(
  title: string,
  recurrence: RecurrenceKind,
  dueDate: Date,
  dueTime: Date | null,
  recurrenceTime: Date | null,
  recurrenceDow: number,
): ActionFormValues {
  return {
    title: title.trim(),
    recurrence,
    dueDate: recurrence === "NONE" ? toLocalDateInput(dueDate) : null,
    dueTime: recurrence === "NONE" && dueTime ? formatTime24(dueTime) : null,
    recurrenceTime:
      recurrence !== "NONE" && recurrenceTime ? formatTime24(recurrenceTime) : null,
    recurrenceDow: recurrence === "WEEKLY" ? recurrenceDow : null,
  };
}

export function AddActionForm({ listId }: { listId: string }) {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const styles = getStyles(palette);

  const [title, setTitle] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceKind>("NONE");
  const [dueDate, setDueDate] = useState(() => new Date());
  const [dueTime, setDueTime] = useState<Date | null>(null);
  const [recurrenceTime, setRecurrenceTime] = useState<Date | null>(null);
  const [recurrenceDow, setRecurrenceDow] = useState(1);
  const [picker, setPicker] = useState<"dueDate" | "dueTime" | "recurrenceTime" | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDraft, setDetailDraft] = useState<ActionDetailDraft>(() =>
    emptyActionDetailDraft(toLocalDateInput(new Date())),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const createAction = trpc.actions.create.useMutation({
    onMutate: async (input) => {
      setFormError(null);
      await utils.actions.getByList.cancel({ listId });
      const previous = utils.actions.getByList.getData({ listId });
      utils.actions.getByList.setData({ listId }, [
        ...(previous ?? []),
        {
          id: `optimistic-${Date.now()}`,
          listId,
          title: input.title,
          done: false,
          recurrence: input.recurrence,
          dueAt: input.dueAt,
          recurrenceTime: input.recurrenceTime ?? null,
          recurrenceDow: input.recurrenceDow ?? null,
          locationLabel: input.locationLabel ?? null,
          locationAddress: input.locationAddress ?? null,
          position: previous?.length ?? 0,
          streakCount: 0,
          bestStreak: 0,
          doneAt: null,
          lastStreakPeriod: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
      return { previous };
    },
    onError: (err, _input, context) => {
      if (context?.previous) {
        utils.actions.getByList.setData({ listId }, context.previous);
      }
      const message = err.message || "Impossible d'ajouter l'action.";
      setFormError(message);
      Alert.alert("Ajout impossible", message);
    },
    onSuccess: (action) => {
      if (action.remindAt) {
        void scheduleActionLocalReminder({
          actionId: action.id,
          title: action.title,
          remindAt: action.remindAt,
        });
      }
      setTitle("");
      setDueDate(new Date());
      setDueTime(null);
      setRecurrenceTime(null);
      setRecurrence("NONE");
      setDetailOpen(false);
      setDetailDraft(emptyActionDetailDraft(toLocalDateInput(new Date())));
      if (action.googleCalendarWarning) {
        const message = `Action créée, mais Google Agenda : ${action.googleCalendarWarning}`;
        setFormError(message);
        Alert.alert("Google Agenda", message);
        return;
      }
      setFormError(null);
    },
    onSettled: () => {
      void utils.actions.getByList.invalidate({ listId });
    },
  });

  const schedule = buildScheduleValues(
    title,
    recurrence,
    dueDate,
    dueTime,
    recurrenceTime,
    recurrenceDow,
  );

  function handleDetailDraftChange(next: ActionDetailDraft) {
    setDetailDraft(next);
    if (recurrence === "NONE") {
      const [year, month, day] = next.dueDate.split("-").map(Number);
      setDueDate(new Date(year, month - 1, day));
      if (next.dueTime) {
        const [hours, minutes] = next.dueTime.split(":").map(Number);
        const time = new Date(year, month - 1, day, hours, minutes, 0, 0);
        setDueTime(time);
      } else {
        setDueTime(null);
      }
    }
  }

  function openDetailModal() {
    setDetailDraft((prev) => ({
      ...prev,
      dueDate: toLocalDateInput(dueDate),
      dueTime: dueTime ? formatTime24(dueTime) : "",
    }));
    setDetailOpen(true);
  }

  function submitValues(values: ActionFormValues) {
    if (!values.title.trim()) return;
    const scheduleError = validateActionSchedule(values);
    if (scheduleError) {
      setFormError(scheduleError);
      Alert.alert("Date invalide", scheduleError);
      return;
    }
    setFormError(null);
    createAction.mutate({
      listId,
      ...toActionMutationFields(values),
      addToGoogleCalendar: values.addToGoogleCalendar ?? false,
    });
  }

  function clampPonctualTime(date: Date, time: Date): Date {
    const combined = new Date(date);
    combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
    const now = new Date();
    return combined < now ? now : time;
  }

  function handleAdd() {
    if (!title.trim()) return;
    Keyboard.dismiss();
    submitValues(schedule);
  }

  function handlePickerChange(event: DateTimePickerEvent, value?: Date) {
    setPicker(null);
    if (event.type !== "set" || !value) return;
    if (picker === "dueDate") {
      setDueDate(value);
      if (dueTime) setDueTime((prev) => (prev ? clampPonctualTime(value, prev) : null));
    }
    if (picker === "dueTime") {
      setDueTime(clampPonctualTime(dueDate, value));
    }
    if (picker === "recurrenceTime") setRecurrenceTime(value);
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Nouvelle action..."
          placeholderTextColor={palette.textSubtle}
          value={title}
          onChangeText={setTitle}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <Pressable
          style={[styles.quickBtn, (!title.trim() || createAction.isPending) && styles.btnDisabled]}
          onPress={handleAdd}
          disabled={!title.trim() || createAction.isPending}
          hitSlop={8}
          accessibilityLabel="Ajouter"
        >
          <Text style={styles.quickBtnText}>{createAction.isPending ? "…" : "+"}</Text>
        </Pressable>
        <Pressable
          style={[styles.detailBtn, (!title.trim() || createAction.isPending) && styles.btnDisabled]}
          onPress={() => {
            Keyboard.dismiss();
            openDetailModal();
          }}
          disabled={!title.trim() || createAction.isPending}
          hitSlop={8}
          accessibilityLabel="Ajouter avec lieu"
        >
          <Text style={styles.detailBtnText}>++</Text>
        </Pressable>
      </View>

      {formError ? <Text style={styles.error}>{formError}</Text> : null}

      <View style={styles.radioRow}>
        {(["NONE", "DAILY", "WEEKLY"] as RecurrenceKind[]).map((r) => (
          <Pressable key={r} style={styles.radioItem} onPress={() => setRecurrence(r)}>
            <View style={[styles.radio, recurrence === r && styles.radioActive]} />
            <Text style={styles.radioLabel}>
              {r === "NONE" ? "Ponctuelle" : r === "DAILY" ? "Chaque jour" : "Chaque semaine"}
            </Text>
          </Pressable>
        ))}
      </View>

      {recurrence === "NONE" && (
        <>
          <Pressable style={styles.fieldBtn} onPress={() => setPicker("dueDate")}>
            <Text style={styles.fieldLabel}>À faire le</Text>
            <Text style={styles.fieldValue}>{dueDate.toLocaleDateString("fr-FR")}</Text>
          </Pressable>
          <Pressable style={styles.fieldBtn} onPress={() => setPicker("dueTime")}>
            <Text style={styles.fieldLabel}>À (optionnel)</Text>
            <Text style={styles.fieldValue}>
              {dueTime ? formatTime24(dueTime) : "Choisir une heure"}
            </Text>
          </Pressable>
        </>
      )}

      {recurrence === "DAILY" && (
        <Pressable style={styles.fieldBtn} onPress={() => setPicker("recurrenceTime")}>
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
          <Pressable style={styles.fieldBtn} onPress={() => setPicker("recurrenceTime")}>
            <Text style={styles.fieldLabel}>À</Text>
            <Text style={styles.fieldValue}>
              {recurrenceTime ? formatTime24(recurrenceTime) : "Choisir une heure"}
            </Text>
          </Pressable>
        </View>
      )}

      {picker === "dueDate" && (
        <DateTimePicker
          value={dueDate}
          mode="date"
          minimumDate={new Date()}
          onChange={handlePickerChange}
        />
      )}
      {picker === "dueTime" && (
        <DateTimePicker
          value={dueTime ?? new Date()}
          mode="time"
          is24Hour
          onChange={handlePickerChange}
        />
      )}
      {picker === "recurrenceTime" && (
        <DateTimePicker
          value={recurrenceTime ?? new Date()}
          mode="time"
          is24Hour
          onChange={handlePickerChange}
        />
      )}

      <AddActionDetailModal
        visible={detailOpen}
        schedule={schedule}
        draft={detailDraft}
        onDraftChange={handleDetailDraftChange}
        formError={formError}
        pending={createAction.isPending}
        onClose={() => setDetailOpen(false)}
        onSubmit={submitValues}
      />
    </View>
  );
}

function getStyles(palette: ReturnType<typeof getPalette>) {
  return StyleSheet.create({
    card: {
      backgroundColor: palette.bgElevated,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      padding: 14,
      marginBottom: 20,
      gap: 12,
    },
    row: { flexDirection: "row", gap: 8, alignItems: "center" },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: palette.text,
      backgroundColor: palette.bgElevated,
    },
    quickBtn: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: palette.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    quickBtnText: { color: palette.onPrimary, fontSize: 22, fontWeight: "700", lineHeight: 24 },
    detailBtn: {
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.bgElevated,
    },
    detailBtnText: { color: palette.text, fontSize: 14, fontWeight: "700" },
    btnDisabled: { opacity: 0.4 },
    error: { fontSize: 13, color: palette.danger },
    radioRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    radioItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: palette.border },
    radioActive: { borderColor: palette.primary, backgroundColor: palette.primary },
    radioLabel: { fontSize: 13, color: palette.textMuted },
    fieldBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
    fieldLabel: { fontSize: 13, color: palette.textMuted },
    fieldValue: { fontSize: 13, color: palette.text },
    dowRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 8 },
    dowBtn: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: palette.border,
    },
    dowBtnActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    dowLabel: { fontSize: 12, color: palette.textMuted },
    dowLabelActive: { color: palette.onPrimary },
  });
}
