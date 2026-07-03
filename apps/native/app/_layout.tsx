import "react-native-gesture-handler";
import "react-native-reanimated";

import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { useEffect, useMemo } from "react";
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
import { useMeValidation } from "@/hooks/use-me-validation";
import { useAuthRedirect } from "@/hooks/use-auth-redirect";
import { useAuthOverlay } from "@/hooks/use-auth-overlay";

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
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);

  const { meUnauthorized, isPending: mePending } = useMeValidation({
    token,
    ready,
    skipMeValidation,
    signOut,
  });

  const bootstrapping = !ready || mePending;
  const pendingApiExchange = ready && isLoaded && isSignedIn && !token;
  const leavingAuthRoute = !!token && segment === "(auth)";

  useAuthRedirect({ bootstrapping, meUnauthorized, token, segment, setAuthFlowBusy, router });

  const { showShell, showOverlay } = useAuthOverlay({
    bootstrapping,
    meUnauthorized,
    pendingApiExchange,
    leavingAuthRoute,
    authFlowBusy,
  });

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
