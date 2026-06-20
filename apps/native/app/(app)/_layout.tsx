import { UserProfileView } from "@clerk/expo/native";
import { Tabs } from "expo-router";
import { Image, Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { TabBarIcon } from "@/components/tab-bar-icon";
import { MenuBottomSheet } from "@/components/menu-bottom-sheet";
import { useAuth } from "@/lib/auth-context";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

export default function AppLayout() {
  const { themeName } = useThemeMode();
  const { user } = useAuth();
  const palette = getPalette(themeName);
  const iconTint = palette.logoTint ?? palette.textSubtle;
  const [menuOpenTick, setMenuOpenTick] = useState(0);
  const [profileVisible, setProfileVisible] = useState(false);
  const initials = computeInitials(user?.name ?? user?.email ?? "?");

  return (
    <>
      <Modal
        visible={profileVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setProfileVisible(false)}
      >
        <SafeAreaView style={[layoutStyles.profileModal, { backgroundColor: palette.bg }]}>
          <UserProfileView
            style={layoutStyles.profileView}
            onDismiss={() => setProfileVisible(false)}
          />
        </SafeAreaView>
      </Modal>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: palette.bgElevated },
          headerTintColor: palette.text,
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          tabBarActiveTintColor: palette.primary,
          tabBarInactiveTintColor: palette.textSubtle,
          tabBarStyle: { backgroundColor: palette.bgElevated, borderTopColor: palette.border },
          sceneStyle: { backgroundColor: palette.bg },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Tâches",
            headerShown: false,
            tabBarLabel: "Tâches",
            tabBarIcon: ({ focused }) => <TabBarIcon name="todolist" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="shopping"
          options={{
            title: "Mes courses",
            headerShown: false,
            tabBarLabel: "Courses",
            tabBarIcon: ({ focused }) => <TabBarIcon name="caddie" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: "Notifications",
            headerShown: false,
            tabBarLabel: "Notif",
            tabBarIcon: ({ focused }) => (
              <MaterialCommunityIcons
                name="bell-outline"
                size={22}
                color={iconTint}
                style={{ opacity: focused ? 1 : 0.5 }}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: "Menu",
            headerShown: false,
            tabBarLabel: "Menu",
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: palette.primary,
                  opacity: focused ? 1 : 0.6,
                }}
              >
                {user?.image ? (
                  <Image
                    source={{ uri: user.image }}
                    style={{ width: 26, height: 26 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ color: palette.onPrimary, fontSize: 10, fontWeight: "700" }}>
                    {initials}
                  </Text>
                )}
              </View>
            ),
            tabBarButton: ({ children, style }) => (
              <Pressable
                accessibilityRole="button"
                style={style}
                onPress={() => setMenuOpenTick((v) => v + 1)}
              >
                {children}
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen
          name="lists/[listId]"
          options={{
            href: null,
            title: "Liste",
            headerBackTitle: "Retour",
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            href: null,
            title: "Mon profil",
            headerBackTitle: "Retour",
            headerShown: true,
          }}
        />
      </Tabs>
      <MenuBottomSheet openTick={menuOpenTick} onOpenProfile={() => setProfileVisible(true)} />
    </>
  );
}

const layoutStyles = StyleSheet.create({
  profileModal: { flex: 1 },
  profileView: { flex: 1 },
});

function computeInitials(str: string): string {
  const parts = str.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}
