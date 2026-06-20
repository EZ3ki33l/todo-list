import { useRouter } from "expo-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getPalette } from "@repo/theme";

import { LoadingIndicator } from "@/components/loading-logo";
import { activityRoute, formatActivityTime } from "@/lib/format-activity-time";
import { useThemeMode } from "@/lib/theme-context";
import { trpc } from "@/lib/trpc";

const NotificationSettings = lazy(() =>
  import("@/components/notification-settings").then((m) => ({
    default: m.NotificationSettings,
  })),
);

type PanelTab = "history" | "settings";

export default function NotificationsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<PanelTab>("history");
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const { themeName } = useThemeMode();
  const palette = useMemo(() => getPalette(themeName), [themeName]);
  const styles = useMemo(() => getStyles(palette), [palette]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      setAppActive(state === "active");
    });
    return () => sub.remove();
  }, []);

  const utils = trpc.useUtils();
  const { data: prefs } = trpc.notifications.getPreferences.useQuery();
  const { data: unread } = trpc.activity.unreadCount.useQuery(undefined, {
    staleTime: 60_000,
    refetchInterval: appActive ? 180_000 : false,
    refetchIntervalInBackground: false,
  });
  const { data: feed, isLoading } = trpc.activity.list.useQuery({ limit: 40 }, { enabled: tab === "history" });

  const markRead = trpc.activity.markRead.useMutation({
    onSuccess: () => {
      void utils.activity.unreadCount.invalidate();
      void utils.activity.list.invalidate();
    },
  });
  const markAllRead = trpc.activity.markAllRead.useMutation({
    onSuccess: () => {
      void utils.activity.unreadCount.invalidate();
      void utils.activity.list.invalidate();
    },
  });

  const count = unread?.count ?? 0;
  const alertsActive = prefs?.alertsEnabled ?? true;

  function openItem(
    id: string,
    isUnread: boolean,
    listKind: "TODO" | "SHOPPING" | null,
    listId: string | null,
  ) {
    if (isUnread) markRead.mutate({ id });
    const route = activityRoute(listKind, listId);
    if (route) router.push(route as never);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <View style={styles.tabs}>
        <Pressable onPress={() => setTab("history")} style={[styles.tab, tab === "history" && styles.tabActive]}>
          <Text style={[styles.tabText, tab === "history" && styles.tabTextActive]}>Historique</Text>
        </Pressable>
        <Pressable onPress={() => setTab("settings")} style={[styles.tab, tab === "settings" && styles.tabActive]}>
          <Text style={[styles.tabText, tab === "settings" && styles.tabTextActive]}>Réglages</Text>
        </Pressable>
      </View>

      {tab === "history" ? (
        <>
          {count > 0 ? (
            <Pressable
              onPress={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              style={styles.markAll}
            >
              <Text style={styles.markAllText}>Tout marquer lu</Text>
            </Pressable>
          ) : null}

          {isLoading ? (
            <LoadingIndicator />
          ) : !feed?.items.length ? (
            <Text style={styles.empty}>
              {alertsActive
                ? "Aucune modification récente sur vos listes partagées."
                : "Les notifications sont désactivées. Activez-les dans Réglages."}
            </Text>
          ) : (
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {feed.items.map((item) => {
                const isUnread = !item.readAt;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => openItem(item.id, isUnread, item.listKind, item.listId)}
                    style={[styles.item, isUnread && styles.itemUnread]}
                  >
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemBody}>{item.body}</Text>
                    <Text style={styles.itemTime}>{formatActivityTime(item.createdAt)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </>
      ) : (
        <ScrollView style={styles.settingsScroll} keyboardShouldPersistTaps="handled">
          <Suspense fallback={<LoadingIndicator />}>
            <NotificationSettings />
          </Suspense>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function getStyles(palette: ReturnType<typeof getPalette>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    header: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderSoft,
    },
    title: { fontSize: 24, fontWeight: "700", color: palette.text },
    tabs: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: palette.borderSoft,
      backgroundColor: palette.bgElevated,
    },
    tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
    tabActive: { borderBottomWidth: 2, borderBottomColor: palette.primary },
    tabText: { fontSize: 14, fontWeight: "600", color: palette.textSubtle },
    tabTextActive: { color: palette.primary },
    markAll: { paddingHorizontal: 16, paddingVertical: 10 },
    markAllText: { fontSize: 13, color: palette.textMuted },
    empty: {
      fontSize: 13,
      color: palette.textSubtle,
      textAlign: "center",
      marginVertical: 24,
      paddingHorizontal: 16,
    },
    list: { paddingHorizontal: 16, flex: 1 },
    settingsScroll: { flex: 1 },
    item: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderSoft,
      borderRadius: 8,
      paddingHorizontal: 8,
      marginTop: 2,
    },
    itemUnread: { backgroundColor: palette.bgSoft },
    itemTitle: { fontSize: 14, fontWeight: "600", color: palette.text },
    itemBody: { fontSize: 13, color: palette.textMuted, marginTop: 4, lineHeight: 18 },
    itemTime: { fontSize: 11, color: palette.textSubtle, marginTop: 6 },
  });
}
