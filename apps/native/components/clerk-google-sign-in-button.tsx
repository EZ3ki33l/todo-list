import { useSignInWithGoogle } from "@clerk/expo/google";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { clerkAuthStyles as styles } from "@/lib/clerk-auth-styles";

function isUserCancelled(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("SIGN_IN_CANCELLED") ||
    message.includes("-5") ||
    message.includes("cancel")
  );
}

function formatGoogleAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (isUserCancelled(err)) return "";

  if (/google_one_tap|strategy.*does not match|not allowed/i.test(message)) {
    return "Clerk → Google SSO : activez « Use custom credentials » (obligatoire pour le natif).";
  }
  if (/token.*invalid|google_one_tap_token_invalid/i.test(message)) {
    return (
      "Token refusé : EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID doit être le client Web Clerk, " +
      "et l'app Android doit être enregistrée (Clerk + Google Cloud : package + SHA-256)."
    );
  }
  if (/DEVELOPER_ERROR|12500|code.*10/i.test(message)) {
    return (
      "Google DEVELOPER_ERROR : créez un client OAuth Android dans Google Cloud " +
      "(package com.ez3ki33l.todolist + SHA-256 du keystore debug)."
    );
  }
  if (/credentials not found/i.test(message)) {
    return "EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID manquant — vérifiez .env puis npx expo start -c.";
  }

  return message || "Connexion Google impossible. Réessayez.";
}

export function ClerkGoogleSignInButton({
  disabled,
  label = "Continuer avec Google",
}: {
  disabled?: boolean;
  label?: string;
}) {
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePress() {
    setError(null);
    setBusy(true);
    try {
      const { createdSessionId, setActive } = await startGoogleAuthenticationFlow();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      const message = formatGoogleAuthError(err);
      if (message) setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={[styles.googleButton, (disabled || busy) && styles.buttonDisabled]}
        onPress={handlePress}
        disabled={disabled || busy}
      >
        {busy ? (
          <ActivityIndicator color="#111827" />
        ) : (
          <Text style={styles.googleButtonText}>{label}</Text>
        )}
      </Pressable>
    </View>
  );
}

export function ClerkAuthDivider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>ou</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}
