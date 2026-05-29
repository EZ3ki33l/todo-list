import { StyleSheet, Text } from "react-native";

type Props = {
  streakCount?: number | null;
  bestStreak?: number | null;
};

export function StreakBadge({ streakCount, bestStreak }: Props) {
  const streak = streakCount ?? 0;
  const best = bestStreak ?? 0;
  if (streak <= 0) return null;

  return (
    <Text style={styles.badge}>
      série {streak}
      {best > streak ? ` · record ${best}` : ""}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 11,
    color: "#C2410C",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
