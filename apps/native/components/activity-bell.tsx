import { useRouter } from "expo-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { AppState } from "react-native";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { LoadingIndicator } from "@/components/loading-logo";
import { FluentEmoji } from "@/components/fluent-emoji";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

const NotificationSettings = lazy(() =>
  import("@/components/notification-settings").then((m) => ({
    default: m.NotificationSettings,
  })),
);
import { activityRoute, formatActivityTime } from "@/lib/format-activity-time";
import { trpc } from "@/lib/trpc";

type PanelTab = "history" | "settings";

export function ActivityBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>("history");
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const styles = getStyles(palette);

  const utils = trpc.useUtils();
  const { data: prefs } = trpc.notifications.getPreferences.useQuery();
  const [appActive, setAppActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      setAppActive(state === "active");
    });
    return () => sub.remove();
  }, []);

  const { data: unread } = trpc.activity.unreadCount.useQuery(undefined, {
    staleTime: 60_000,
    refetchInterval: appActive ? 180_000 : false,
    refetchIntervalInBackground: false,
  });
  const { data: feed, isLoading } = trpc.activity.list.useQuery(
    { limit: 40 },
    { enabled: open && tab === "history" },
  );

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
    setOpen(false);
    const route = activityRoute(listKind, listId);
    if (route) router.push(route as never);
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityLabel={
          count > 0 ? `${count} notification(s) non lue(s)` : "Notifications et historique"
        }
        style={styles.bellBtn}
      >
        <FluentEmoji emoji="🔔" size={20} />
        {count > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Notifications</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Text style={styles.close}>Fermer</Text>
              </Pressable>
            </View>

            <View style={styles.tabs}>
              <Pressable
                onPress={() => setTab("history")}
                style={[styles.tab, tab === "history" && styles.tabActive]}
              >
                <Text style={[styles.tabText, tab === "history" && styles.tabTextActive]}>
                  Historique
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTab("settings")}
                style={[styles.tab, tab === "settings" && styles.tabActive]}
              >
                <Text style={[styles.tabText, tab === "settings" && styles.tabTextActive]}>
                  Réglages
                </Text>
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
                          onPress={() =>
                            openItem(item.id, isUnread, item.listKind, item.listId)
                          }
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
          </View>
        </View>
      </Modal>
    </>
  );
}

function getStyles(palette: ReturnType<typeof getPalette>) {
  return StyleSheet.create({
  bellBtn: { position: "relative", paddingHorizontal: 4, paddingVertical: 2 },
  bellIcon: { fontSize: 20 },
  badge: {
    position: "absolute",
    right: -2,
    top: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: palette.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: palette.onPrimary, fontSize: 9, fontWeight: "700" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: palette.bgElevated,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "82%",
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderSoft,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: palette.text },
  close: { fontSize: 14, color: palette.textMuted, fontWeight: "600" },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: palette.borderSoft,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
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
  list: { paddingHorizontal: 16, maxHeight: 360 },
  settingsScroll: { maxHeight: 420 },
  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderSoft,
  },
  itemUnread: { backgroundColor: palette.bgSoft },
  itemTitle: { fontSize: 14, fontWeight: "600", color: palette.text },
  itemBody: { fontSize: 13, color: palette.textMuted, marginTop: 4, lineHeight: 18 },
  itemTime: { fontSize: 11, color: palette.textSubtle, marginTop: 6 },
});
}
