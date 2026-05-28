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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    setErrorMessage(null);
    setLoading(true);
    try {
      const result = await enablePushNotifications((input) =>
        registerPush.mutateAsync(input),
      );
      if (result.ok) {
        await refetch();
        await refresh();
        return;
      }
      setPermission(result.permission);
      if (result.permission === "denied") {
        setErrorMessage("Autorisez les notifications dans les réglages du téléphone.");
      } else {
        setErrorMessage(result.reason ?? "Impossible d'activer les notifications.");
      }
    } catch {
      setErrorMessage("Erreur réseau ou serveur. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      await disablePushNotifications((input) => unregisterPush.mutateAsync(input));
      await refetch();
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  if (active) {
    return (
      <View style={[styles.card, styles.cardOk]}>
        <Text style={styles.titleOk}>Notifications activées</Text>
        <Text style={styles.hint}>
          Un seul résumé ~45 s après des ajouts sur une liste partagée.
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
          Ouvrez les réglages du téléphone et autorisez les notifications pour cette app.
        </Text>
        <Pressable style={styles.btnSecondary} onPress={openSystemNotificationSettings}>
          <Text style={styles.btnSecondaryText}>Ouvrir les réglages</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Liste partagée</Text>
      <Text style={styles.hint}>
        Recevez un résumé quand l'autre personne ajoute des articles — pas une alerte par
        produit.
      </Text>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
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
      {errorMessage ? (
        <Pressable style={styles.btnSecondary} onPress={openSystemNotificationSettings}>
          <Text style={styles.btnSecondaryText}>Ouvrir les réglages</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 16,
  },
  cardOk: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  title: { fontSize: 15, fontWeight: "600", color: "#0F172A", marginBottom: 6 },
  titleOk: { fontSize: 15, fontWeight: "600", color: "#166534", marginBottom: 6 },
  hint: { fontSize: 13, color: "#475569", lineHeight: 19, marginBottom: 12 },
  error: { fontSize: 13, color: "#DC2626", marginBottom: 10 },
  btn: {
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  btnSecondary: {
    marginTop: 10,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#fff",
  },
  btnSecondaryText: { color: "#334155", fontWeight: "600", fontSize: 14 },
  link: { fontSize: 13, color: "#6B7280", textDecorationLine: "underline" },
});
