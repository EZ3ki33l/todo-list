import { Redirect } from "expo-router";
import { StyleSheet, View } from "react-native";

import { LoadingLogo } from "@/components/loading-logo";
import { TodoHubSkeleton } from "@/components/todo-hub-skeleton";
import { useAuth } from "@/lib/auth-context";

export default function Index() {
  const { ready, token } = useAuth();

  if (!ready) {
    return (
      <View style={styles.boot}>
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
    backgroundColor: "#F9FAFB",
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
