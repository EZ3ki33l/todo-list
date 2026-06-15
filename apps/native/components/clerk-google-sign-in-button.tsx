import { isClerkAPIResponseError, useAuth as useClerkAuth, useClerk } from "@clerk/expo";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { clerkAuthStyles as styles } from "@/lib/clerk-auth-styles";
import { useCompleteClerkAppSignIn } from "@/hooks/use-complete-clerk-app-sign-in";
import { useAuth as useAppAuth } from "@/lib/auth-context";
import { runClerkGoogleNativeAuth } from "@/lib/clerk-google-native-auth";

function isUserCancelled(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("SIGN_IN_CANCELLED") ||
    message.includes("-5") ||
    message.toLowerCase().includes("cancel")
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
      "Token refusé par Clerk : dans Clerk → Google SSO, le Client ID doit être le client Web " +
      "(aud du token), avec le Secret du même client. Vérifiez aussi Native applications → Android (SHA-256)."
    );
  }
  if (/DEVELOPER_ERROR|12500|code.*10/i.test(message)) {
    return (
      "Google DEVELOPER_ERROR : créez un client OAuth Android dans Google Cloud " +
      "(package Android de l'app + SHA-256 du keystore debug)."
    );
  }
  if (/credentials not found/i.test(message)) {
    return "EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID manquant — vérifiez .env puis npx expo start -c.";
  }
  if (/session_exists|already signed in/i.test(message)) {
    return "";
  }

  return message || "Connexion Google impossible. Réessayez.";
}

function formatNonSuccessResult(
  outcome: Extract<
    Awaited<ReturnType<typeof runClerkGoogleNativeAuth>>,
    { kind: "missing_requirements" | "needs_continuation" | "google_non_success" }
  >,
): string {
  if (outcome.kind === "missing_requirements") {
    const fields = outcome.missingFields.length > 0 ? outcome.missingFields.join(", ") : "(vide)";
    return `Inscription Google incomplète — champs manquants Clerk : ${fields}`;
  }
  if (outcome.kind === "needs_continuation") {
    return (
      `Clerk n'a pas finalisé la session (signIn: ${outcome.signInStatus ?? "?"}, ` +
      `signUp: ${outcome.signUpStatus ?? "?"}). Réessayez.`
    );
  }
  return (
    `Google n'a pas renvoyé de token (type: ${outcome.responseType ?? "?"}). ` +
    "Vérifiez le client OAuth Android + SHA-256 dans Google Cloud."
  );
}

function formatCancelledOrReady(kind: string): string {
  if (kind === "clerk_not_ready") {
    return "Clerk n'est pas prêt — réessayez dans quelques secondes.";
  }
  if (kind === "cancelled") {
    return "Connexion Google annulée.";
  }
  if (kind === "no_credential") {
    return "Aucun compte Google enregistré sur l'appareil.";
  }
  return "Connexion Google impossible.";
}

export function ClerkGoogleSignInButton({
  disabled,
  label = "Continuer avec Google",
}: {
  disabled?: boolean;
  label?: string;
}) {
  const clerk = useClerk();
  const { isSignedIn } = useClerkAuth({ treatPendingAsSignedOut: false });
  const { token } = useAppAuth();
  const completeAppSignIn = useCompleteClerkAppSignIn();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePress() {
    setError(null);
    setBusy(true);
    try {
      if (isSignedIn && !token) {
        await completeAppSignIn();
        return;
      }

      const outcome = await runClerkGoogleNativeAuth(clerk);

      if (outcome.kind === "success") {
        await completeAppSignIn();
        return;
      }

      if (
        outcome.kind === "missing_requirements" ||
        outcome.kind === "needs_continuation" ||
        outcome.kind === "google_non_success"
      ) {
        setError(formatNonSuccessResult(outcome));
        return;
      }

      const message = formatCancelledOrReady(outcome.kind);
      if (message) setError(message);
    } catch (err) {
      if (
        isClerkAPIResponseError(err) &&
        err.errors?.some((e) => e.code === "session_exists")
      ) {
        try {
          await completeAppSignIn();
          return;
        } catch (exchangeErr) {
          setError(exchangeErr instanceof Error ? exchangeErr.message : "Connexion impossible.");
          return;
        }
      }

      if (err instanceof Error && err.message && !isClerkAPIResponseError(err)) {
        setError(err.message);
        return;
      }

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
