import { Text } from "react-native";
import { Tabs } from "expo-router";

function tabIcon(symbol: string) {
  return ({ color }: { color: string }) => (
    <Text style={{ fontSize: 22, color }}>{symbol}</Text>
  );
}

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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tâches",
          headerShown: false,
          tabBarLabel: "Tâches",
          tabBarIcon: tabIcon("📋"),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: "Mes courses",
          headerShown: false,
          tabBarLabel: "Courses",
          tabBarIcon: tabIcon("🛒"),
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
