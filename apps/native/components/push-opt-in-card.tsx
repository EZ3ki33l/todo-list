import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  disablePushNotifications,
  enablePushNotifications,
  getPushPermissionStatus,
  openSystemNotificationSettings,
  type PushPermissionStatus,
} from "@/lib/push-notifications";
import { isPushOptIn } from "@/lib/push-preferences";
import { trpc } from "@/lib/trpc";

type Props = {
  /** Liste partagée avec au moins une autre personne impliquée. */
  visible: boolean;
};

export function PushOptInCard({ visible }: Props) {
  const [permission, setPermission] = useState<PushPermissionStatus>("undetermined");
  const [optIn, setOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const registerPush = trpc.notifications.registerPushToken.useMutation();
  const unregisterPush = trpc.notifications.unregisterPushToken.useMutation();
  const { data: serverRegistered, refetch } = trpc.notifications.isPushRegistered.useQuery(
    undefined,
    { enabled: visible },
  );

  const refresh = useCallback(async () => {
    setChecking(true);
    const [perm, localOptIn] = await Promise.all([
      getPushPermissionStatus(),
      isPushOptIn(),
    ]);
    setPermission(perm);
    setOptIn(localOptIn && perm === "granted");
    setChecking(false);
  }, []);

  useEffect(() => {
    if (visible) void refresh();
  }, [visible, refresh, serverRegistered?.registered]);

  if (!visible || checking) return null;

  const active = optIn && serverRegistered?.registered;

  async function handleEnable() {
    setLoading(true);
    const result = await enablePushNotifications((input) =>
      registerPush.mutateAsync(input),
    );
    setLoading(false);
    if (result.ok) {
      await refetch();
      await refresh();
    } else if (result.permission === "denied") {
      setPermission("denied");
    }
  }

  async function handleDisable() {
    setLoading(true);
    await disablePushNotifications((input) => unregisterPush.mutateAsync(input));
    await refetch();
    await refresh();
    setLoading(false);
  }

  if (active) {
    return (
      <View style={[styles.card, styles.cardOk]}>
        <Text style={styles.titleOk}>Notifications activées</Text>
        <Text style={styles.hint}>
          Vous recevrez un résumé ~45 s après des ajouts sur une liste partagée.
        </Text>
        <Pressable onPress={handleDisable} disabled={loading}>
          <Text style={styles.link}>Désactiver</Text>
        </Pressable>
      </View>
    );
  }

  if (permission === "denied") {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Notifications désactivées</Text>
        <Text style={styles.hint}>
          Autorisez les notifications dans les réglages du téléphone pour être prévenu des
          ajouts sur les listes partagées.
        </Text>
        <Pressable style={styles.btn} onPress={openSystemNotificationSettings}>
          <Text style={styles.btnText}>Ouvrir les réglages</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Listes partagées</Text>
      <Text style={styles.hint}>
        Activez les notifications pour recevoir un seul résumé quand l'autre personne ajoute
        des articles (pas une alerte par produit).
      </Text>
      <Pressable
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleEnable}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Activer les notifications</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 14,
    marginBottom: 16,
  },
  cardOk: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  title: { fontSize: 14, fontWeight: "600", color: "#1E40AF", marginBottom: 6 },
  titleOk: { fontSize: 14, fontWeight: "600", color: "#166534", marginBottom: 6 },
  hint: { fontSize: 13, color: "#374151", lineHeight: 18, marginBottom: 12 },
  btn: {
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  link: { fontSize: 13, color: "#6B7280", textDecorationLine: "underline" },
});
