import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet } from "react-native";
import { Avatar, Separator, Sheet, Text, XStack, YStack } from "tamagui";
import { router } from "expo-router";

import { getPalette, type AppPalette } from "@repo/theme";

import { FluentEmoji } from "@/components/fluent-emoji";
import { useAuth } from "@/lib/auth-context";
import { useThemeMode } from "@/lib/theme-context";

// ─── Sous-composant item de menu ─────────────────────────────────────────────

function MenuItem({
  onPress,
  palette,
  danger = false,
  children,
}: {
  onPress: () => void;
  palette: AppPalette;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        {
          backgroundColor: pressed
            ? danger
              ? palette.dangerBg
              : palette.bgSoft
            : "transparent",
          borderRadius: 10,
        },
      ]}
    >
      <XStack alignItems="center" gap={14} flex={1}>
        {children}
      </XStack>
    </Pressable>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { themeName, toggleTheme } = useThemeMode();
  const palette = useMemo(() => getPalette(themeName), [themeName]);

  const initials = computeInitials(user?.name ?? user?.email ?? "?");
  const imageUrl = user?.image ?? null;

  function handleSignOut() {
    setOpen(false);
    Alert.alert("Déconnexion", "Voulez-vous vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        style: "destructive",
        onPress: () => void signOut(),
      },
    ]);
  }

  function handleProfile() {
    setOpen(false);
    router.push("/(app)/profile");
  }

  return (
    <>
      {/* ── Bouton avatar ─────────────────────────────── */}
      <Pressable onPress={() => setOpen(true)} hitSlop={10}>
        <Avatar circular size={34}>
          {imageUrl ? <Avatar.Image accessibilityLabel="Photo de profil" src={imageUrl} /> : null}
          <Avatar.Fallback
            backgroundColor={palette.primary}
            alignItems="center"
            justifyContent="center"
          >
            <Text color={palette.onPrimary} fontSize={13} fontWeight="700" lineHeight={34}>
              {initials}
            </Text>
          </Avatar.Fallback>
        </Avatar>
      </Pressable>

      {/* ── Sheet menu ────────────────────────────────── */}
      <Sheet
        open={open}
        onOpenChange={setOpen}
        snapPoints={[44]}
        dismissOnSnapToBottom
        modal
        animation="medium"
      >
        <Sheet.Overlay
          animation="lazy"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          backgroundColor={palette.overlay}
        />
        <Sheet.Handle backgroundColor={palette.border} opacity={0.5} />
        <Sheet.Frame
          paddingHorizontal={20}
          paddingTop={8}
          paddingBottom={32}
          backgroundColor={palette.bgElevated}
        >
          {/* ── En-tête identité ── */}
          <XStack
            alignItems="center"
            gap={14}
            paddingVertical={12}
            marginBottom={4}
          >
            <Avatar circular size={48}>
              {imageUrl ? (
                <Avatar.Image accessibilityLabel="Photo de profil" src={imageUrl} />
              ) : null}
              <Avatar.Fallback
                backgroundColor={palette.primary}
                alignItems="center"
                justifyContent="center"
              >
                <Text color={palette.onPrimary} fontSize={18} fontWeight="700" lineHeight={48}>
                  {initials}
                </Text>
              </Avatar.Fallback>
            </Avatar>

            <YStack flex={1} gap={3}>
              {user?.name ? (
                <Text
                  fontSize={16}
                  fontWeight="700"
                  color={palette.text}
                  numberOfLines={1}
                >
                  {user.name}
                </Text>
              ) : null}
              <Text fontSize={13} color={palette.textMuted} numberOfLines={1}>
                {user?.email ?? "—"}
              </Text>
            </YStack>
          </XStack>

          <Separator borderColor={palette.borderSoft} marginBottom={8} />

          {/* ── Thème ── */}
          <MenuItem onPress={toggleTheme} palette={palette}>
            <FluentEmoji emoji={themeName === "latte" ? "🌙" : "🌤️"} size={20} />
            <Text fontSize={15} color={palette.text} flex={1}>
              {themeName === "latte" ? "Mode sombre" : "Mode clair"}
            </Text>
          </MenuItem>

          {/* ── Profil ── */}
          <MenuItem onPress={handleProfile} palette={palette}>
            <Text fontSize={19} style={styles.itemIcon}>👤</Text>
            <Text fontSize={15} color={palette.text} flex={1}>
              Mon profil
            </Text>
            <Text fontSize={16} color={palette.textSubtle}>›</Text>
          </MenuItem>

          {/* ── Déconnexion ── */}
          <MenuItem onPress={handleSignOut} palette={palette} danger>
            <Text fontSize={19} style={styles.itemIcon}>🚪</Text>
            <Text fontSize={15} color={palette.danger} flex={1} fontWeight="600">
              Déconnexion
            </Text>
          </MenuItem>
        </Sheet.Frame>
      </Sheet>
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeInitials(str: string): string {
  const parts = str.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase();
  return (
    (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
  ).toUpperCase();
}

const styles = StyleSheet.create({
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 13,
    marginBottom: 2,
  },
  itemIcon: {
    lineHeight: 22,
    width: 22,
    textAlign: "center",
  },
});
