import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/expo";
import { Avatar } from "tamagui";
import { router } from "expo-router";

import { getPalette, type AppPalette } from "@repo/theme";

import { useThemeMode } from "@/lib/theme-context";

export default function ProfileScreen() {
  const { themeName } = useThemeMode();
  const palette = useMemo(() => getPalette(themeName), [themeName]);
  const styles = useMemo(() => getStyles(palette), [palette]);

  const { user, isLoaded } = useUser();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
    }
  }, [user]);

  function markDirty() {
    if (!dirty) setDirty(true);
  }

  async function handleSave() {
    if (!user || !dirty) return;
    setSaving(true);
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      setDirty(false);
      Alert.alert("Profil mis à jour", "Vos informations ont été enregistrées.");
    } catch {
      Alert.alert("Erreur", "Impossible de mettre à jour le profil. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  const initials = computeInitials(
    user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "?",
  );
  const imageUrl = user?.imageUrl ?? null;
  const email = user?.primaryEmailAddress?.emailAddress ?? "—";

  if (!isLoaded) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Avatar centré ── */}
          <View style={styles.avatarWrap}>
            <Avatar circular size={88}>
              {imageUrl ? (
                <Avatar.Image accessibilityLabel="Photo de profil" src={imageUrl} />
              ) : null}
              <Avatar.Fallback
                backgroundColor={palette.primary}
                alignItems="center"
                justifyContent="center"
              >
                <Text style={styles.avatarInitials}>{initials}</Text>
              </Avatar.Fallback>
            </Avatar>
          </View>

          {/* ── Email (lecture seule) ── */}
          <View style={styles.field}>
            <Text style={styles.label}>Adresse e-mail</Text>
            <View style={[styles.input, styles.inputReadOnly]}>
              <Text style={styles.inputTextMuted}>{email}</Text>
            </View>
            <Text style={styles.hint}>L'email ne peut pas être modifié ici.</Text>
          </View>

          {/* ── Prénom ── */}
          <View style={styles.field}>
            <Text style={styles.label}>Prénom</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={(v) => { setFirstName(v); markDirty(); }}
              placeholder="Votre prénom"
              placeholderTextColor={palette.textSubtle}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* ── Nom de famille ── */}
          <View style={styles.field}>
            <Text style={styles.label}>Nom</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={(v) => { setLastName(v); markDirty(); }}
              placeholder="Votre nom"
              placeholderTextColor={palette.textSubtle}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={() => void handleSave()}
            />
          </View>

          {/* ── Bouton sauvegarder ── */}
          <Pressable
            style={[styles.saveBtn, (!dirty || saving) && styles.saveBtnDisabled]}
            onPress={() => void handleSave()}
            disabled={!dirty || saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Text>
          </Pressable>

          {/* ── Bouton retour ── */}
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Retour</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles dynamiques ────────────────────────────────────────────────────────

function getStyles(p: AppPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: p.bg },
    flex: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

    avatarWrap: { alignItems: "center", marginBottom: 28 },
    avatarInitials: {
      color: p.onPrimary,
      fontSize: 32,
      fontWeight: "700",
      lineHeight: 88,
    },

    field: { marginBottom: 16 },
    label: {
      fontSize: 12,
      fontWeight: "600",
      color: p.textSubtle,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: p.text,
      backgroundColor: p.bgElevated,
    },
    inputReadOnly: {
      backgroundColor: p.bgSoft,
      borderColor: p.borderSoft,
    },
    inputTextMuted: { fontSize: 15, color: p.textMuted },
    hint: { fontSize: 11, color: p.textSubtle, marginTop: 4 },

    saveBtn: {
      backgroundColor: p.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
      marginBottom: 12,
    },
    saveBtnDisabled: { opacity: 0.4 },
    saveBtnText: { color: p.onPrimary, fontWeight: "700", fontSize: 15 },

    backBtn: { alignItems: "center", paddingVertical: 12 },
    backBtnText: { fontSize: 14, color: p.textMuted },
  });
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function computeInitials(str: string): string {
  const parts = str.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase();
  return (
    (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
  ).toUpperCase();
}
