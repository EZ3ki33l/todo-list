import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
});

const DEVELOPER_ERROR_MSG =
  "Config Google Cloud incorrecte. Crée un client OAuth Android (package com.ez3ki33l.todolist + SHA-1 debug). Voir DEPLOY.md §3.";

export default function LoginScreen() {
  const { signIn: storeSession } = useAuth();
  const [googleError, setGoogleError] = useState<string | null>(null);

  const signIn = trpc.auth.signInWithGoogleIdToken.useMutation({
    onSuccess: async (data) => {
      await storeSession(data.token, data.user);
    },
  });

  async function handleSignIn() {
    setGoogleError(null);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error("Pas d'idToken");
      signIn.mutate({ idToken });
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (error.code === statusCodes.IN_PROGRESS) return;
      console.error("[Google Sign-In]", error);
      if (error.code === statusCodes.DEVELOPER_ERROR) {
        setGoogleError(DEVELOPER_ERROR_MSG);
        return;
      }
      setGoogleError(error.message ?? "Connexion Google impossible.");
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

      {displayError ? <Text style={styles.error}>{displayError}</Text> : null}
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
  error: { marginTop: 16, color: "#DC2626", fontSize: 13, textAlign: "center" },
});
