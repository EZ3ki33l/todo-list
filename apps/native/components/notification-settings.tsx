import { NOTIFICATION_TYPE_OPTIONS } from "@repo/api/notification-constants";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import {
  disablePushNotifications,
  enablePushNotifications,
  getPushPermissionStatus,
  openSystemNotificationSettings,
} from "@/lib/push-notifications";
import { trpc } from "@/lib/trpc";

type Prefs = {
  alertsEnabled: boolean;
  shoppingItemsAdded: boolean;
  shoppingListShared: boolean;
  todoListShared: boolean;
};

export function NotificationSettings() {
  const utils = trpc.useUtils();
  const { data: prefs, isLoading } = trpc.notifications.getPreferences.useQuery();

  const update = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      void utils.notifications.getPreferences.invalidate();
      void utils.activity.unreadCount.invalidate();
    },
  });

  const registerPush = trpc.notifications.registerPushToken.useMutation();
  const unregisterPush = trpc.notifications.unregisterPushToken.useMutation();

  function patch(partial: Partial<Prefs>) {
    update.mutate(partial);
  }

  async function togglePush(enabled: boolean) {
    if (enabled) {
      const result = await enablePushNotifications((input) =>
        registerPush.mutateAsync(input),
      );
      if (!result.ok) {
        const perm = await getPushPermissionStatus();
        if (perm === "denied") openSystemNotificationSettings();
      }
      void utils.notifications.getPreferences.invalidate();
      return;
    }
    await disablePushNotifications((input) => unregisterPush.mutateAsync(input));
    void utils.notifications.getPreferences.invalidate();
  }

  if (isLoading || !prefs) {
    return <ActivityIndicator style={{ marginVertical: 24 }} />;
  }

  const typesDisabled = !prefs.alertsEnabled || update.isPending;

  return (
    <View style={styles.wrap}>
      <View style={styles.masterRow}>
        <View style={styles.masterText}>
          <Text style={styles.masterTitle}>Recevoir des notifications</Text>
          <Text style={styles.masterHint}>
            Désactivé = plus d&apos;alertes ni d&apos;historique pour les types ci-dessous.
          </Text>
        </View>
        <Switch
          value={prefs.alertsEnabled}
          onValueChange={(v) => patch({ alertsEnabled: v })}
          disabled={update.isPending}
        />
      </View>

      <Text style={styles.section}>Types de notifications</Text>
      {NOTIFICATION_TYPE_OPTIONS.map((opt) => (
        <View key={opt.key} style={[styles.typeRow, typesDisabled && styles.typeDisabled]}>
          <View style={styles.typeText}>
            <Text style={styles.typeLabel}>{opt.label}</Text>
            <Text style={styles.typeDesc}>{opt.description}</Text>
          </View>
          <Switch
            value={prefs[opt.key]}
            onValueChange={(v) => patch({ [opt.key]: v })}
            disabled={typesDisabled}
          />
        </View>
      ))}

      <Text style={styles.section}>Sur le téléphone</Text>
      <View style={[styles.typeRow, !prefs.alertsEnabled && styles.typeDisabled]}>
        <View style={styles.typeText}>
          <Text style={styles.typeLabel}>Notifications push</Text>
          <Text style={styles.typeDesc}>
            Alertes système quand l&apos;app est en arrière-plan
          </Text>
        </View>
        <Switch
          value={prefs.pushRegistered}
          onValueChange={(v) => void togglePush(v)}
          disabled={!prefs.alertsEnabled || registerPush.isPending || unregisterPush.isPending}
        />
      </View>

      {!prefs.pushRegistered && prefs.alertsEnabled ? (
        <Pressable onPress={openSystemNotificationSettings} style={styles.settingsLink}>
          <Text style={styles.settingsLinkText}>Ouvrir les réglages système</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingVertical: 12 },
  masterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 8,
  },
  masterText: { flex: 1 },
  masterTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  masterHint: { fontSize: 12, color: "#64748B", marginTop: 4, lineHeight: 17 },
  section: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  typeDisabled: { opacity: 0.45 },
  typeText: { flex: 1 },
  typeLabel: { fontSize: 14, fontWeight: "600", color: "#111827" },
  typeDesc: { fontSize: 12, color: "#64748B", marginTop: 3, lineHeight: 17 },
  settingsLink: { alignItems: "center", paddingVertical: 8 },
  settingsLinkText: { fontSize: 13, color: "#6B7280", textDecorationLine: "underline" },
});
