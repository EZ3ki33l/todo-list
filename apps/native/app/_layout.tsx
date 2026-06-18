import "react-native-gesture-handler";
import "react-native-reanimated";

import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { useEffect, useMemo, useState } from "react";
import { SystemBars } from "react-native-edge-to-edge";
import { AppState, StyleSheet, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import tamaguiConfig from "../tamagui.config";

import { AuthLoadingOverlay } from "@/components/auth-loading-overlay";
import { ClerkSessionBridge } from "@/components/clerk-session-bridge";
import { PushTokenSync } from "@/components/push-registration";
import { trpc, createTrpcClient } from "@/lib/trpc";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeModeProvider, useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

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
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);

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
  // Filet de sécurité : évite un écran blanc si shell masqué sans overlay explicite.
  const showOverlay = showLoadingOverlay || !showShell;

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
    <View style={[styles.root, { backgroundColor: palette.bgElevated }]}>
      {showShell ? children : null}
      {showOverlay ? <AuthLoadingOverlay /> : null}
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

function RootApp() {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const isDark = themeName === "mocha";
  const systemBarStyle = isDark ? "light" : "dark";

  useEffect(() => {
    SystemBars.setStyle({
      statusBar: systemBarStyle,
      navigationBar: systemBarStyle,
    });
  }, [systemBarStyle]);

  return (
    <>
      <SystemBars style={{ statusBar: systemBarStyle, navigationBar: systemBarStyle }} />
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.bgElevated }}>
        <TamaguiProvider config={tamaguiConfig as any} defaultTheme={themeName}>
          <SafeAreaProvider>
            <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
              <AuthProvider>
                <RootNavigator />
              </AuthProvider>
            </ClerkProvider>
          </SafeAreaProvider>
        </TamaguiProvider>
      </GestureHandlerRootView>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <RootApp />
    </ThemeModeProvider>
  );
}
