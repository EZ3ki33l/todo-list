import { useEffect, useMemo } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { trpc, createTrpcClient } from "@/lib/trpc";
import { AuthProvider, useAuth } from "@/lib/auth-context";

const queryClient = new QueryClient();

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

  useEffect(() => {
    const code = (meQuery.error as { data?: { code?: string } } | null)?.data?.code;
    if (code === "UNAUTHORIZED") {
      signOut();
    }
  }, [meQuery.error, signOut]);

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === "(auth)";
    const inApp = segments[0] === "(app)";
    if (!token && !inAuth) router.replace("/(auth)/login");
    if (token && !inApp) router.replace("/(app)");
  }, [ready, token, segments]);

  return <>{children}</>;
}

function RootNavigator() {
  const { token } = useAuth();
  const trpcClient = useMemo(() => createTrpcClient(() => token), [token]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthGuard>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthGuard>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
