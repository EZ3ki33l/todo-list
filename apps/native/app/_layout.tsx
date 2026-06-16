import "react-native-gesture-handler";
import "react-native-reanimated";

import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { useEffect, useMemo, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthLoadingOverlay } from "@/components/auth-loading-overlay";
import { ClerkSessionBridge } from "@/components/clerk-session-bridge";
import { PushTokenSync } from "@/components/push-registration";
import { trpc, createTrpcClient } from "@/lib/trpc";
import { AuthProvider, useAuth } from "@/lib/auth-context";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY manquant");
}
const clerkPublishableKey: string = publishableKey;

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
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { ready, token, skipMeValidation, signOut, authFlowBusy, setAuthFlowBusy } = useAuth();
  const { isSignedIn, isLoaded } = useClerkAuth({ treatPendingAsSignedOut: false });
  const router = useRouter();
  const segments = useSegments();
  const segment = segments[0];
  const [meValidationTimedOut, setMeValidationTimedOut] = useState(false);

  const shouldValidateStoredToken = !!token && ready && !skipMeValidation;

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: shouldValidateStoredToken,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const meUnauthorized =
    shouldValidateStoredToken &&
    meQuery.isFetched &&
    (meQuery.error as { data?: { code?: string } } | null)?.data?.code === "UNAUTHORIZED";

  useEffect(() => {
    if (meUnauthorized) {
      void signOut();
    }
  }, [meUnauthorized, signOut]);

  useEffect(() => {
    if (!shouldValidateStoredToken || meQuery.isFetched || meQuery.isError) {
      setMeValidationTimedOut(false);
      return;
    }
    if (!meQuery.isLoading) return;

    const timer = setTimeout(() => {
      setMeValidationTimedOut(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, [shouldValidateStoredToken, meQuery.isLoading, meQuery.isFetched, meQuery.isError]);

  const bootstrapping =
    !ready ||
    (shouldValidateStoredToken &&
      !meValidationTimedOut &&
      meQuery.isLoading &&
      !meQuery.isFetched);

  const pendingApiExchange = ready && isLoaded && isSignedIn && !token;
  const leavingAuthRoute = !!token && segment === "(auth)";
  const showLoadingOverlay =
    bootstrapping ||
    meUnauthorized ||
    pendingApiExchange ||
    leavingAuthRoute ||
    authFlowBusy;
  const renderChildren = !meUnauthorized;
  const showShell = renderChildren && !leavingAuthRoute && !bootstrapping;

  useEffect(() => {
    if (token && segment === "(app)") {
      setAuthFlowBusy(false);
    }
  }, [token, segment, setAuthFlowBusy]);

  useEffect(() => {
    if (bootstrapping || meUnauthorized) return;

    if (!token) {
      if (segment !== "(auth)") {
        router.replace("/(auth)/login");
      }
      return;
    }

    if (segment !== "(app)") {
      router.replace("/(app)");
    }
  }, [bootstrapping, meUnauthorized, token, segment, router]);

  return (
    <View style={styles.root}>
      {showShell ? children : null}
      {showLoadingOverlay ? <AuthLoadingOverlay /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

function RootNavigator() {
  const { token } = useAuth();
  const trpcClient = useMemo(() => createTrpcClient(() => token), [token]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthGuard>
          <ClerkSessionBridge />
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
        <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
