import { useSignIn } from "@clerk/expo";
import { SignIn } from "@clerk/expo/web";
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

async function finalizeClerkSignIn(signIn: ReturnType<typeof useSignIn>["signIn"]) {
  if (signIn.status !== "complete") return;
  await signIn.finalize();
}

function NativeLoginScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const completeAppSignIn = useCompleteClerkAppSignIn();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const busy = fetchStatus === "fetching" || submitting;

  async function handleSubmit() {
    setFormError(null);
    setSubmitting(true);
    try {
      const { error } = await signIn.password({ emailAddress, password });
      if (error) {
        setFormError(error.message ?? "Connexion impossible");
        return;
      }

      if (signIn.status === "complete") {
        await finalizeClerkSignIn(signIn);
        await completeAppSignIn();
        return;
      }

      if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
        const emailCodeFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code",
        );
        if (emailCodeFactor) {
          await signIn.mfa.sendEmailCode();
          setAwaitingCode(true);
          return;
        }
      }

      setFormError("Étape de connexion supplémentaire requise (MFA). Utilisez le site web.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode() {
    setFormError(null);
    setSubmitting(true);
    try {
      await signIn.mfa.verifyEmailCode({ code });
      if (signIn.status === "complete") {
        await finalizeClerkSignIn(signIn);
        await completeAppSignIn();
        return;
      }
      setFormError("Code invalide ou expiré.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  if (awaitingCode) {
    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
          <Text style={styles.title}>Vérification</Text>
          <Text style={styles.subtitle}>Entrez le code reçu par e-mail.</Text>
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
            onPress={handleVerifyCode}
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
            onPress={() => void signIn.mfa.sendEmailCode()}
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
        <Text style={styles.title}>Todo List</Text>
        <Text style={styles.subtitle}>Connectez-vous pour accéder à vos listes.</Text>

        <ClerkGoogleSignInButton disabled={busy} />
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
        {errors.fields.identifier ? (
          <Text style={styles.error}>{errors.fields.identifier.message}</Text>
        ) : null}

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
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
            <Text style={styles.buttonText}>Se connecter</Text>
          )}
        </Pressable>

        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Pas encore de compte ?</Text>
          <Link href="/(auth)/sign-up">
            <Text style={styles.linkAction}>Créer un compte</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function LoginScreen() {
  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#fff" }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827", marginBottom: 24 }}>Todo List</Text>
        <SignIn routing="hash" signUpUrl="/sign-up" />
        <Link href="/(auth)/sign-up" asChild>
          <Text style={{ marginTop: 20, fontSize: 14, fontWeight: "600", color: "#111827" }}>Créer un compte</Text>
        </Link>
      </View>
    );
  }

  return <NativeLoginScreen />;
}
