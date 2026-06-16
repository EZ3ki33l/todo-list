import { Tabs } from "expo-router";

import { TabBarIcon } from "@/components/tab-bar-icon";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#111827",
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        tabBarActiveTintColor: "#111827",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: "#E5E7EB" },
        sceneStyle: { backgroundColor: "#F9FAFB" },
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
