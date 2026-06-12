import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";

import { formatGoogleSignInError } from "@/lib/google-signin-errors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

GoogleSignin.configure({
  webClientId,
});

export default function LoginScreen() {
  const { signIn: storeSession } = useAuth();
  const [googleError, setGoogleError] = useState<string | null>(null);

  const signIn = trpc.auth.signInWithGoogleIdToken.useMutation({
    onSuccess: async (data) => {
      await storeSession(data.token, data.user);
    },
    onError: (error) => {
      console.error("[Google Sign-In API]", error);
    },
  });

  async function handleSignIn() {
    setGoogleError(null);
    try {
      if (!webClientId) {
        setGoogleError(
          "EXPO_PUBLIC_GOOGLE_CLIENT_ID manquant dans ce build.\nVérifiez les variables EAS production.",
        );
        return;
      }

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) {
        setGoogleError("Google n'a pas renvoyé d'idToken.\nRéessayez ou vérifiez le compte sélectionné.");
        return;
      }
      signIn.mutate({ idToken });
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (err.code === statusCodes.IN_PROGRESS) return;

      console.error("[Google Sign-In]", JSON.stringify(err, null, 2));

      if (err.code === statusCodes.DEVELOPER_ERROR) {
        setGoogleError(formatGoogleSignInError(err));
        return;
      }

      setGoogleError(formatGoogleSignInError(err));
    }
  }

  const displayError = googleError ?? (signIn.isError ? signIn.error.message : null);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Todo List</Text>
      <Text style={styles.subtitle}>Connectez-vous pour accéder à vos listes</Text>

      {signIn.isPending ? (
        <ActivityIndicator size="large" color="#111827" />
      ) : (
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleSignIn}
        >
          <Text style={styles.buttonText}>Se connecter avec Google</Text>
        </Pressable>
      )}

      {displayError ? (
        <ScrollView style={styles.errorBox} contentContainerStyle={styles.errorContent}>
          <Text style={styles.error}>{displayError}</Text>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", color: "#111827", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 40 },
  button: { backgroundColor: "#111827", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 8 },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  errorBox: { marginTop: 16, maxHeight: 220, width: "100%" },
  errorContent: { paddingHorizontal: 4 },
  error: { color: "#DC2626", fontSize: 12, lineHeight: 18, textAlign: "left", fontFamily: "monospace" },
});
