import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useUser } from "@clerk/expo";

import type { ActionDetailDraft, ActionFormValues } from "@repo/api/lib/action-form";
import {
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  REMINDER_PRESET_OPTIONS,
  mergeScheduleWithDetailDraft,
  toLocalDateInput,
} from "@repo/api/lib/action-form";
import { resolveMapsQuery } from "@repo/api/lib/maps";
import { openMapsNavigation } from "@/lib/open-maps";
import { trpc } from "@/lib/trpc";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

type Props = {
  visible: boolean;
  schedule: ActionFormValues;
  draft: ActionDetailDraft;
  onDraftChange: (draft: ActionDetailDraft) => void;
  pending?: boolean;
  formError?: string | null;
  onClose: () => void;
  onSubmit: (values: ActionFormValues) => void;
};

function formatTime24(d: Date) {
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function parseDueDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function parseDueTime(value: string, baseDate: Date): Date {
  const [hours, minutes] = value.split(":").map(Number);
  const d = new Date(baseDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function AddActionDetailModal({
  visible,
  schedule,
  draft,
  onDraftChange,
  pending = false,
  formError = null,
  onClose,
  onSubmit,
}: Props) {
  const { user, isLoaded } = useUser();
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const styles = getStyles(palette);

  const [picker, setPicker] = useState<"dueDate" | "dueTime" | null>(null);

  const hasGoogle =
    isLoaded &&
    (user?.externalAccounts?.some(
      (account) => account.provider === "google",
    ) ??
      false);
  const { data: googleCalendarStatus } = trpc.auth.googleCalendarStatus.useQuery(undefined, {
    enabled: hasGoogle,
  });
  const googleCalendarReady =
    (googleCalendarStatus?.hasToken && googleCalendarStatus?.hasCalendarScope) ?? false;

  const mapsQuery = resolveMapsQuery(draft.locationLabel, draft.locationAddress);
  const dueDateValue = parseDueDate(draft.dueDate || toLocalDateInput(new Date()));
  const dueTimeValue = draft.dueTime
    ? parseDueTime(draft.dueTime, dueDateValue)
    : new Date();

  function patchDraft(patch: Partial<ActionDetailDraft>) {
    onDraftChange({ ...draft, ...patch });
  }

  function clampPonctualTime(date: Date, time: Date): Date {
    const combined = new Date(date);
    combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
    const now = new Date();
    return combined < now ? now : time;
  }

  function handlePickerChange(event: DateTimePickerEvent, value?: Date) {
    setPicker(null);
    if (event.type !== "set" || !value) return;
    if (picker === "dueDate") {
      const nextDate = toLocalDateInput(value);
      let nextTime = draft.dueTime;
      if (draft.dueTime) {
        nextTime = formatTime24(clampPonctualTime(value, parseDueTime(draft.dueTime, value)));
      }
      patchDraft({ dueDate: nextDate, dueTime: nextTime });
    }
    if (picker === "dueTime") {
      patchDraft({ dueTime: formatTime24(clampPonctualTime(dueDateValue, value)) });
    }
  }

  function handleSubmit() {
    if (!schedule.title.trim()) return;
    onSubmit(mergeScheduleWithDetailDraft(schedule, draft));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Détails de l&apos;action</Text>
            <Text style={styles.subtitle}>Options facultatives pour « {schedule.title} ».</Text>

            {schedule.recurrence === "NONE" ? (
              <>
                <Text style={styles.sectionLabel}>Planification</Text>
                <Pressable style={styles.fieldBtn} onPress={() => setPicker("dueDate")}>
                  <Text style={styles.fieldLabel}>À faire le</Text>
                  <Text style={styles.fieldValue}>
                    {dueDateValue.toLocaleDateString("fr-FR")}
                  </Text>
                </Pressable>
                <Pressable style={styles.fieldBtn} onPress={() => setPicker("dueTime")}>
                  <Text style={styles.fieldLabel}>À (optionnel)</Text>
                  <Text style={styles.fieldValue}>
                    {draft.dueTime ? draft.dueTime : "Choisir une heure"}
                  </Text>
                </Pressable>
              </>
            ) : null}

            <Text style={styles.sectionLabel}>Lieu</Text>
            <TextInput
              style={styles.input}
              value={draft.locationLabel}
              onChangeText={(value) => patchDraft({ locationLabel: value })}
              placeholder="Nom du lieu"
              placeholderTextColor={palette.textSubtle}
            />
            <TextInput
              style={styles.input}
              value={draft.locationAddress}
              onChangeText={(value) => patchDraft({ locationAddress: value })}
              placeholder="Adresse"
              placeholderTextColor={palette.textSubtle}
            />
            {mapsQuery ? (
              <Pressable onPress={() => void openMapsNavigation(mapsQuery)}>
                <Text style={styles.mapsLink}>S&apos;y rendre</Text>
              </Pressable>
            ) : null}

            <Text style={styles.sectionLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={draft.notes}
              onChangeText={(value) => patchDraft({ notes: value })}
              placeholder="Notes libres…"
              placeholderTextColor={palette.textSubtle}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={styles.sectionLabel}>Alerte</Text>
            <View style={styles.chipRow}>
              {REMINDER_PRESET_OPTIONS.map((option) => (
                <Pressable
                  key={option.id}
                  style={[styles.chip, draft.reminderPreset === option.id && styles.chipActive]}
                  onPress={() => patchDraft({ reminderPreset: option.id })}
                >
                  <Text
                    style={[
                      styles.chipText,
                      draft.reminderPreset === option.id && styles.chipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                style={[styles.chip, draft.reminderPreset === "custom" && styles.chipActive]}
                onPress={() => patchDraft({ reminderPreset: "custom" })}
              >
                <Text
                  style={[
                    styles.chipText,
                    draft.reminderPreset === "custom" && styles.chipTextActive,
                  ]}
                >
                  Personnalisé
                </Text>
              </Pressable>
            </View>
            {draft.reminderPreset === "custom" ? (
              <View style={styles.customRow}>
                <TextInput
                  style={[styles.input, styles.customAmount]}
                  value={draft.customAmount}
                  onChangeText={(value) => patchDraft({ customAmount: value })}
                  keyboardType="number-pad"
                  placeholder="1"
                  placeholderTextColor={palette.textSubtle}
                />
                <View style={styles.unitRow}>
                  {(["hours", "days"] as const).map((unit) => (
                    <Pressable
                      key={unit}
                      style={[styles.unitBtn, draft.customUnit === unit && styles.unitBtnActive]}
                      onPress={() => patchDraft({ customUnit: unit })}
                    >
                      <Text
                        style={[
                          styles.unitBtnText,
                          draft.customUnit === unit && styles.unitBtnTextActive,
                        ]}
                      >
                        {unit === "hours" ? "heure(s)" : "jour(s)"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            <Text style={styles.hint}>Alerte système sur cet appareil.</Text>

            {hasGoogle ? (
              <View style={styles.googleSection}>
                <View style={styles.googleRow}>
                  <Text style={styles.googleLabel}>Ajouter à Google Agenda</Text>
                  <Switch
                    value={draft.addToGoogleCalendar}
                    onValueChange={(value) => patchDraft({ addToGoogleCalendar: value })}
                    trackColor={{ false: palette.border, true: palette.primary }}
                  />
                </View>
                {!googleCalendarReady ? (
                  <Text style={styles.hint}>
                    {googleCalendarStatus?.hasToken === false
                      ? "Jeton Google indisponible — reconnectez Google depuis votre profil Clerk."
                      : googleCalendarStatus?.hasCalendarScope === false
                        ? `Le jeton actuel n'a pas l'accès Agenda. Reconnectez Google après avoir ajouté le scope ${GOOGLE_CALENDAR_EVENTS_SCOPE} dans Clerk.`
                        : "Avec des credentials Google personnalisées, activez aussi l'API Google Calendar dans la console Google Cloud du même projet OAuth."}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {formError ? <Text style={styles.error}>{formError}</Text> : null}

            <View style={styles.actions}>
              <Pressable
                style={[styles.primaryBtn, (!schedule.title.trim() || pending) && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={!schedule.title.trim() || pending}
              >
                <Text style={styles.primaryBtnText}>{pending ? "Ajout…" : "Ajouter"}</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={onClose}>
                <Text style={styles.secondaryBtnText}>Fermer</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>

      {picker === "dueDate" && (
        <DateTimePicker
          value={dueDateValue}
          mode="date"
          minimumDate={new Date()}
          onChange={handlePickerChange}
        />
      )}
      {picker === "dueTime" && (
        <DateTimePicker
          value={dueTimeValue}
          mode="time"
          is24Hour
          onChange={handlePickerChange}
        />
      )}
    </Modal>
  );
}

function getStyles(palette: ReturnType<typeof getPalette>) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-end",
    },
    sheet: {
      maxHeight: "88%",
      backgroundColor: palette.bgElevated,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      padding: 20,
    },
    title: { fontSize: 18, fontWeight: "700", color: palette.text },
    subtitle: { fontSize: 14, color: palette.textMuted, marginBottom: 8 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: palette.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 12,
      marginBottom: 6,
    },
    fieldBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    fieldLabel: { fontSize: 13, color: palette.textMuted },
    fieldValue: { fontSize: 13, color: palette.text },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: palette.text,
      backgroundColor: palette.bgElevated,
      marginBottom: 8,
    },
    textArea: { minHeight: 72 },
    mapsLink: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.primary,
      marginBottom: 4,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    chipText: { fontSize: 12, color: palette.textMuted },
    chipTextActive: { color: palette.onPrimary, fontWeight: "600" },
    customRow: { flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center" },
    customAmount: { width: 64, marginBottom: 0 },
    unitRow: { flex: 1, flexDirection: "row", gap: 6 },
    unitBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: "center",
    },
    unitBtnActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    unitBtnText: { fontSize: 12, color: palette.textMuted },
    unitBtnTextActive: { color: palette.onPrimary, fontWeight: "600" },
    hint: { fontSize: 12, color: palette.textSubtle, marginTop: 6 },
    error: { fontSize: 13, color: palette.danger, marginTop: 8 },
    googleSection: { marginTop: 16, gap: 6 },
    googleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    googleLabel: { fontSize: 14, color: palette.text, flex: 1, paddingRight: 12 },
    actions: { flexDirection: "row", gap: 8, marginTop: 20, marginBottom: 8 },
    primaryBtn: {
      flex: 1,
      backgroundColor: palette.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    primaryBtnText: { color: palette.onPrimary, fontWeight: "700" },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
    },
    secondaryBtnText: { color: palette.textMuted, fontWeight: "600" },
    btnDisabled: { opacity: 0.5 },
  });
}
