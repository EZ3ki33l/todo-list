import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { formatActionLocation, resolveMapsQuery } from "@repo/api/lib/maps";
import { openMapsNavigation } from "@/lib/open-maps";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

type Props = {
  visible: boolean;
  locationLabel: string | null;
  locationAddress: string | null;
  onClose: () => void;
};

export function ActionLocationSheet({
  visible,
  locationLabel,
  locationAddress,
  onClose,
}: Props) {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const styles = getStyles(palette);

  const display = formatActionLocation(locationLabel, locationAddress);
  const mapsQuery = resolveMapsQuery(locationLabel, locationAddress);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Lieu</Text>
          <Text style={styles.body}>{display ?? "Aucune adresse renseignée."}</Text>

          {mapsQuery ? (
            <Pressable
              style={styles.primaryBtn}
              onPress={() => void openMapsNavigation(mapsQuery)}
            >
              <Text style={styles.primaryBtnText}>S&apos;y rendre</Text>
            </Pressable>
          ) : null}

          <Pressable style={styles.secondaryBtn} onPress={onClose}>
            <Text style={styles.secondaryBtnText}>Fermer</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function getStyles(palette: ReturnType<typeof getPalette>) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-end",
      padding: 16,
    },
    sheet: {
      backgroundColor: palette.bgElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      padding: 20,
      gap: 12,
    },
    title: { fontSize: 18, fontWeight: "700", color: palette.text },
    body: { fontSize: 14, color: palette.textMuted, lineHeight: 20 },
    primaryBtn: {
      backgroundColor: palette.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    primaryBtnText: { color: palette.onPrimary, fontWeight: "700", fontSize: 15 },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    secondaryBtnText: { color: palette.textMuted, fontWeight: "600", fontSize: 15 },
  });
}
