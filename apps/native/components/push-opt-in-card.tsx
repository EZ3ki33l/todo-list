import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getPalette, type AppPalette } from "@repo/theme";
import { LoadingLogo } from "@/components/loading-logo";
import { FluentEmoji } from "@/components/fluent-emoji";
import { useFocusEffect } from "expo-router";

import {
  disablePushNotifications,
  enablePushNotifications,
  getPushPermissionStatus,
  openSystemNotificationSettings,
  type PushPermissionStatus,
} from "@/lib/push-notifications";
import { isPushOptIn } from "@/lib/push-preferences";
import { useThemeMode } from "@/lib/theme-context";
import { trpc } from "@/lib/trpc";

const PUSH_HELP_MESSAGES = {
  shopping:
    "Quand quelqu'un ajoute des articles sur une liste partagée, vous recevez un seul résumé environ 45 secondes après — pas une alerte par produit.",
  todo:
    "Recevez une alerte quand une liste de tâches vous est partagée ou qu'un événement important concerne vos listes partagées.",
} as const;

type Props = {
  /** Liste partagée avec au moins une autre personne impliquée. */
  visible: boolean;
  /** Dans la ligne « Partager la liste », sans marge basse. */
  embedded?: boolean;
  listKind?: keyof typeof PUSH_HELP_MESSAGES;
};

export function PushOptInCard({ visible, embedded, listKind = "shopping" }: Props) {
  const helpMessage = PUSH_HELP_MESSAGES[listKind];
  const [permission, setPermission] = useState<PushPermissionStatus>("undetermined");
  const [optIn, setOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const { themeName } = useThemeMode();
  const palette = useMemo(() => getPalette(themeName), [themeName]);
  const styles = useMemo(() => getChipStyles(palette), [palette]);

  const utils = trpc.useUtils();
  const registerPush = trpc.notifications.registerPushToken.useMutation({
    onSuccess: () => {
      utils.notifications.getPreferences.setData(undefined, (old) =>
        old ? { ...old, pushRegistered: true } : old,
      );
      utils.notifications.isPushRegistered.setData(undefined, { registered: true });
    },
  });
  const unregisterPush = trpc.notifications.unregisterPushToken.useMutation({
    onSuccess: () => {
      utils.notifications.getPreferences.setData(undefined, (old) =>
        old ? { ...old, pushRegistered: false } : old,
      );
      utils.notifications.isPushRegistered.setData(undefined, { registered: false });
    },
  });

  const { data: serverRegistered, refetch } = trpc.notifications.isPushRegistered.useQuery(
    undefined,
    { enabled: visible },
  );
  const { data: prefs } = trpc.notifications.getPreferences.useQuery(undefined, {
    enabled: visible,
  });

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
  }, [visible, refresh, serverRegistered?.registered, prefs?.pushRegistered]);

  useFocusEffect(
    useCallback(() => {
      if (!visible) return;
      void refresh();
      void refetch();
    }, [visible, refresh, refetch]),
  );

  useEffect(() => {
    if (!visible) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refresh();
        void refetch();
      }
    });
    return () => sub.remove();
  }, [visible, refresh, refetch]);

  const active =
    optIn && (serverRegistered?.registered ?? prefs?.pushRegistered ?? false);

  async function handleEnable() {
    setLoading(true);
    try {
      const result = await enablePushNotifications((input) =>
        registerPush.mutateAsync(input),
      );
      if (result.ok) {
        utils.notifications.getPreferences.setData(undefined, (old) =>
          old ? { ...old, pushRegistered: true } : old,
        );
        utils.notifications.isPushRegistered.setData(undefined, { registered: true });
        await refetch();
        await refresh();
        return;
      }
      setPermission(result.permission);
      if (result.permission === "denied") {
        Alert.alert(
          "Notifications",
          "Autorisez les notifications dans les réglages du téléphone.",
          [
            { text: "Réglages", onPress: openSystemNotificationSettings },
            { text: "OK", style: "cancel" },
          ],
        );
      } else if (result.reason) {
        Alert.alert("Notifications", result.reason);
      }
    } catch {
      Alert.alert("Notifications", "Erreur réseau ou serveur. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      await disablePushNotifications((input) => unregisterPush.mutateAsync(input));
      utils.notifications.getPreferences.setData(undefined, (old) =>
        old ? { ...old, pushRegistered: false } : old,
      );
      utils.notifications.isPushRegistered.setData(undefined, { registered: false });
      await refetch();
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  function openMenu() {
    if (active) {
      Alert.alert("Notifications activées", helpMessage, [
        { text: "Désactiver", style: "destructive", onPress: () => void handleDisable() },
        { text: "OK", style: "cancel" },
      ]);
      return;
    }

    if (permission === "denied") {
      Alert.alert(
        "Notifications désactivées",
        "Autorisez les notifications pour cette app dans les réglages du téléphone.",
        [
          { text: "Ouvrir les réglages", onPress: openSystemNotificationSettings },
          { text: "Annuler", style: "cancel" },
        ],
      );
      return;
    }

    Alert.alert("Notifications", helpMessage, [
      { text: "Activer", onPress: () => void handleEnable() },
      { text: "Plus tard", style: "cancel" },
    ]);
  }

  if (!visible || checking) return null;

  return (
    <Pressable
      onPress={openMenu}
      disabled={loading}
      hitSlop={8}
      accessibilityLabel={
        active
          ? "Alertes activées pour cette liste"
          : "Alertes désactivées pour cette liste"
      }
      accessibilityRole="button"
      style={[styles.wrap, embedded && styles.wrapEmbedded]}
    >
      {loading ? (
        <LoadingLogo size={18} tintColor={active ? palette.success : palette.danger} />
      ) : (
        <View style={[styles.chip, active ? styles.chipOn : styles.chipOff]}>
          <FluentEmoji emoji="🔔" size={16} />
          <Text style={[styles.label, active ? styles.labelOn : styles.labelOff]}>
            Alertes
          </Text>
          <View style={[styles.dot, active ? styles.dotOn : styles.dotOff]} />
        </View>
      )}
    </Pressable>
  );
}

function getChipStyles(p: AppPalette) {
  return StyleSheet.create({
    wrap: { alignSelf: "flex-end", marginBottom: 8 },
    wrapEmbedded: { alignSelf: "center", marginBottom: 0 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 14,
      borderWidth: 1,
    },
    chipOn: { backgroundColor: p.successBg, borderColor: p.success },
    chipOff: { backgroundColor: p.dangerBg, borderColor: p.danger },
    bell: { fontSize: 12, lineHeight: 14 },
    label: { fontSize: 12, fontWeight: "600" },
    labelOn: { color: p.success },
    labelOff: { color: p.danger },
    dot: { width: 7, height: 7, borderRadius: 4 },
    dotOn: { backgroundColor: p.success },
    dotOff: { backgroundColor: p.danger },
  });
}

