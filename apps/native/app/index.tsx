import { Redirect } from "expo-router";
import { StyleSheet, View } from "react-native";

import { LoadingLogo } from "@/components/loading-logo";
import { TodoHubSkeleton } from "@/components/todo-hub-skeleton";
import { useAuth } from "@/lib/auth-context";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

export default function Index() {
  const { ready, token } = useAuth();
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);

  if (!ready) {
    return (
      <View style={[styles.boot, { backgroundColor: palette.bg }]}>
        <View style={styles.bootLogo}>
          <LoadingLogo size={64} />
        </View>
        <View style={styles.bootSkeleton}>
          <TodoHubSkeleton withSharedLists={false} columnsOnly />
        </View>
      </View>
    );
  }

  return <Redirect href={token ? "/(app)" : "/(auth)/login"} />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  bootLogo: {
    alignItems: "center",
    marginBottom: 28,
  },
  bootSkeleton: {
    flex: 1,
    opacity: 0.85,
  },
});
