import { useEffect, useMemo } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { trpc, createTrpcClient } from "@/lib/trpc";
import { AuthProvider, useAuth } from "@/lib/auth-context";

const queryClient = new QueryClient();

function RootNavigator() {
  const { ready, token } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === "(auth)";
    const inApp = segments[0] === "(app)";
    if (!token && !inAuth) router.replace("/(auth)/login");
    if (token && !inApp) router.replace("/(app)");
  }, [ready, token, segments]);

  const trpcClient = useMemo(() => createTrpcClient(() => token), [token]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
