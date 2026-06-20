import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { useEffect, useMemo, useRef } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "tamagui";

import { getPalette, type AppPalette } from "@repo/theme";

import { useAuth } from "@/lib/auth-context";
import { useThemeMode } from "@/lib/theme-context";

function ThemeSwitch({
  isDark,
  onToggle,
  palette,
}: {
  isDark: boolean;
  onToggle: () => void;
  palette: AppPalette;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel={isDark ? "Activer le thème clair" : "Activer le thème sombre"}
      style={[
        styles.themeSwitchTrack,
        { backgroundColor: isDark ? palette.primary : palette.borderSoft },
      ]}
    >
      <View
        style={[
          styles.themeSwitchThumb,
          { backgroundColor: palette.bgElevated },
          isDark ? styles.themeSwitchThumbOn : styles.themeSwitchThumbOff,
        ]}
      >
        <Text style={styles.themeSwitchEmoji}>{isDark ? "🌙" : "☀️"}</Text>
      </View>
    </Pressable>
  );
}

function SettingRow({
  icon,
  label,
  right,
  onPress,
  palette,
}: {
  icon: string;
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  palette: AppPalette;
}) {
  const content = (
    <View style={styles.rowInner}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={[styles.rowLabel, { color: palette.text }]}>{label}</Text>
      {right}
    </View>
  );

  if (!onPress) {
    return <View style={[styles.rowCard, { borderColor: palette.borderSoft }]}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.rowCard,
        {
          borderColor: palette.borderSoft,
          backgroundColor: pressed ? palette.bgSoft : palette.bgElevated,
        },
      ]}
    >
      {content}
    </Pressable>
  );
}

type Props = {
  openTick: number;
  onOpenProfile: () => void;
};

export function MenuBottomSheet({ openTick, onOpenProfile }: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const { themeName, toggleTheme } = useThemeMode();
  const { user, signOut } = useAuth();
  const palette = useMemo(() => getPalette(themeName), [themeName]);
  const snapPoints = useMemo(() => ["58%", "74%"], []);
  const isDark = themeName === "mocha";
  const initials = useMemo(() => computeInitials(user?.name ?? user?.email ?? "?"), [user?.name, user?.email]);
  const styles2 = useMemo(() => getStyles(palette), [palette]);

  // Ouvre le sheet à chaque appui sur l'onglet Menu
  useEffect(() => {
    if (openTick > 0) {
      requestAnimationFrame(() => {
        sheetRef.current?.snapToIndex(0);
      });
    }
  }, [openTick]);

  function onLogout() {
    Alert.alert("Déconnexion", "Voulez-vous vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnexion", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      bottomInset={insets.bottom}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.35} />
      )}
      backgroundStyle={styles2.sheetBg}
      handleIndicatorStyle={[styles.handle, { backgroundColor: palette.border }]}
    >
      <BottomSheetView style={[styles.content, { paddingBottom: insets.bottom + 18 }]}>
        <View style={[styles.profileCard, { backgroundColor: palette.bg, borderColor: palette.borderSoft }]}>
          <Avatar circular size={48}>
            {user?.image ? <Avatar.Image src={user.image} accessibilityLabel="Photo de profil" /> : null}
            <Avatar.Fallback alignItems="center" justifyContent="center" backgroundColor={palette.primary}>
              <Text style={[styles.avatarInitials, { color: palette.onPrimary }]}>{initials}</Text>
            </Avatar.Fallback>
          </Avatar>
          <View style={styles.profileTextWrap}>
            <Text style={[styles.profileName, { color: palette.text }]} numberOfLines={1}>
              {user?.name ?? "Mon compte"}
            </Text>
            <Text style={[styles.profileEmail, { color: palette.textMuted }]} numberOfLines={1}>
              {user?.email ?? ""}
            </Text>
          </View>
        </View>

        <View style={styles.rows}>
          <SettingRow
            icon="🎨"
            label="Thème"
            palette={palette}
            right={<ThemeSwitch isDark={isDark} onToggle={toggleTheme} palette={palette} />}
          />
          <SettingRow
            icon="👤"
            label="Personnaliser le profil"
            palette={palette}
            right={<Text style={[styles.chevron, { color: palette.textSubtle }]}>›</Text>}
            onPress={() => {
              sheetRef.current?.close();
              onOpenProfile();
            }}
          />
        </View>

        <Pressable
          onPress={onLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            { backgroundColor: palette.danger, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={[styles.logoutText, { color: palette.onPrimary }]}>Se déconnecter</Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
}

function computeInitials(str: string): string {
  const parts = str.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

function getStyles(palette: AppPalette) {
  return StyleSheet.create({
    sheetBg: {
      backgroundColor: palette.bgElevated,
      borderTopWidth: 1,
      borderTopColor: palette.borderSoft,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
  });
}

const styles = StyleSheet.create({
  handle: { width: 42, height: 4, borderRadius: 2, opacity: 0.45 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 18, gap: 14 },
  profileCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarInitials: { fontSize: 16, fontWeight: "700", lineHeight: 18 },
  profileTextWrap: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 16, fontWeight: "700" },
  profileEmail: { fontSize: 13, marginTop: 2 },
  rows: { gap: 10 },
  rowCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  rowInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowIcon: { fontSize: 18, width: 22, textAlign: "center" },
  rowLabel: { fontSize: 15, flex: 1 },
  chevron: { fontSize: 18, fontWeight: "300" },
  themeSwitchTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 3,
    justifyContent: "center",
  },
  themeSwitchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  themeSwitchThumbOn: { alignSelf: "flex-end" },
  themeSwitchThumbOff: { alignSelf: "flex-start" },
  themeSwitchEmoji: { fontSize: 12, lineHeight: 13 },
  logoutBtn: { marginTop: 4, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  logoutText: { fontSize: 15, fontWeight: "700" },
});
