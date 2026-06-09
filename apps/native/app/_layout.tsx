import { useEffect, useMemo } from "react";
import { AppState, ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { PushTokenSync } from "@/components/push-registration";
import { trpc, createTrpcClient } from "@/lib/trpc";
import { AuthProvider, useAuth } from "@/lib/auth-context";

focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener("change", (state) => {
    handleFocus(state === "active");
  });
  return () => sub.remove();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { ready, token, signOut } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Valide le token au démarrage (et à chaque changement). Si le serveur
  // renvoie UNAUTHORIZED, on déconnecte. Les erreurs réseau ne déclenchent
  // pas de signOut pour préserver la session en mode offline.
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: !!token && ready,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const meUnauthorized =
    (meQuery.error as { data?: { code?: string } } | null)?.data?.code === "UNAUTHORIZED";

  useEffect(() => {
    if (meUnauthorized) {
      void signOut();
    }
  }, [meUnauthorized, signOut]);

  const sessionResolved = ready && (!token || meQuery.isFetched);

  useEffect(() => {
    if (!sessionResolved) return;
    if (token && meUnauthorized) return;

    const inAuth = segments[0] === "(auth)";
    const inApp = segments[0] === "(app)";
    if (!token && !inAuth) router.replace("/(auth)/login");
    else if (token && !inApp) router.replace("/(app)");
  }, [sessionResolved, token, meUnauthorized, segments, router]);

  if (!sessionResolved || (token && meUnauthorized)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

function RootNavigator() {
  const { token } = useAuth();
  const trpcClient = useMemo(() => createTrpcClient(() => token), [token]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthGuard>
          <PushTokenSync />
          <Stack screenOptions={{ headerShown: false }} />
        </AuthGuard>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
