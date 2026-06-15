import { useSignUp } from "@clerk/expo";
import { SignUp } from "@clerk/expo/web";
import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { clerkAuthStyles as styles } from "@/lib/clerk-auth-styles";
import { ClerkAuthDivider, ClerkGoogleSignInButton } from "@/components/clerk-google-sign-in-button";
import { useCompleteClerkAppSignIn } from "@/hooks/use-complete-clerk-app-sign-in";

async function finalizeClerkSignUp(signUp: ReturnType<typeof useSignUp>["signUp"]) {
  if (signUp.status !== "complete") return;
  await signUp.finalize();
}

function NativeSignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const completeAppSignIn = useCompleteClerkAppSignIn();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const busy = fetchStatus === "fetching";

  const needsEmailVerification =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  async function handleSubmit() {
    setFormError(null);
    const { error } = await signUp.password({ emailAddress, password });
    if (error) {
      setFormError(error.message ?? "Inscription impossible");
      return;
    }
    if (!error) {
      await signUp.verifications.sendEmailCode();
    }
  }

  async function handleVerify() {
    setFormError(null);
    try {
      await signUp.verifications.verifyEmailCode({ code });
      if (signUp.status === "complete") {
        await finalizeClerkSignUp(signUp);
        await completeAppSignIn();
        return;
      }
      setFormError("Code invalide ou expiré.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Inscription impossible.");
    }
  }

  if (needsEmailVerification) {
    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
          <Text style={styles.title}>Vérifiez votre e-mail</Text>
          <Text style={styles.subtitle}>Un code a été envoyé à {emailAddress}.</Text>
          <Text style={styles.label}>Code</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            placeholder="123456"
            placeholderTextColor="#9CA3AF"
          />
          {errors.fields.code ? (
            <Text style={styles.error}>{errors.fields.code.message}</Text>
          ) : null}
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Pressable
            style={[styles.button, (!code || busy) && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={!code || busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Valider</Text>
            )}
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => void signUp.verifications.sendEmailCode()}
            disabled={busy}
          >
            <Text style={styles.secondaryButtonText}>Renvoyer le code</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Inscrivez-vous pour partager vos listes.</Text>

        <ClerkGoogleSignInButton disabled={busy} label="S'inscrire avec Google" />
        <ClerkAuthDivider />

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={emailAddress}
          onChangeText={setEmailAddress}
          placeholder="vous@exemple.fr"
          placeholderTextColor="#9CA3AF"
        />
        {errors.fields.emailAddress ? (
          <Text style={styles.error}>{errors.fields.emailAddress.message}</Text>
        ) : null}

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          placeholder="••••••••"
          placeholderTextColor="#9CA3AF"
        />
        {errors.fields.password ? (
          <Text style={styles.error}>{errors.fields.password.message}</Text>
        ) : null}
        {formError ? <Text style={styles.error}>{formError}</Text> : null}

        <Pressable
          style={[styles.button, (!emailAddress || !password || busy) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!emailAddress || !password || busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>S'inscrire</Text>
          )}
        </Pressable>

        <View nativeID="clerk-captcha" />

        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Déjà un compte ?</Text>
          <Link href="/(auth)/login">
            <Text style={styles.linkAction}>Se connecter</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function SignUpScreen() {
  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#fff" }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827", marginBottom: 24 }}>Créer un compte</Text>
        <SignUp routing="hash" signInUrl="/login" />
        <Link href="/(auth)/login" asChild>
          <Text style={{ marginTop: 20, fontSize: 14, fontWeight: "600", color: "#111827" }}>Se connecter</Text>
        </Link>
      </View>
    );
  }

  return <NativeSignUpScreen />;
}
