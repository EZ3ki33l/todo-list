import { useMemo } from "react";
import { StyleSheet, Text } from "react-native";

import { getPalette, type AppPalette } from "@repo/theme";

import { useThemeMode } from "@/lib/theme-context";

type Props = {
  streakCount?: number | null;
  bestStreak?: number | null;
};

export function StreakBadge({ streakCount, bestStreak }: Props) {
  const streak = streakCount ?? 0;
  const best = bestStreak ?? 0;
  const { themeName } = useThemeMode();
  const styles = useMemo(() => getStyles(getPalette(themeName)), [themeName]);

  if (streak <= 0) return null;

  return (
    <Text style={styles.badge}>
      série {streak}
      {best > streak ? ` · record ${best}` : ""}
    </Text>
  );
}

function getStyles(p: AppPalette) {
  return StyleSheet.create({
    badge: {
      fontSize: 11,
      color: p.streakText,
      backgroundColor: p.streakBg,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
  });
}
