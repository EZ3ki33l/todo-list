import { Tabs } from "expo-router";

import { TabBarIcon } from "@/components/tab-bar-icon";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

export default function AppLayout() {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);

  return (
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
        name="lists/[listId]"
        options={{
          href: null,
          title: "Liste",
          headerBackTitle: "Retour",
        }}
      />
    </Tabs>
  );
}
