import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { Skeleton, SkeletonLine } from "@/components/skeleton";
import { getListHubStyles } from "@/lib/list-hub-styles";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

export function SharedListsSkeleton() {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const hub = useMemo(() => getListHubStyles(palette), [palette]);

  return (
    <View style={hub.section}>
      <SkeletonLine width="42%" style={styles.sectionTitle} />
      {[0, 1].map((key) => (
        <View key={key} style={hub.listCard}>
          <View style={styles.cardBody}>
            <SkeletonLine width="55%" />
            <SkeletonLine width="38%" style={styles.meta} />
          </View>
        </View>
      ))}
      <View style={[hub.createRow, styles.createRow]}>
        <Skeleton height={42} borderRadius={8} style={styles.input} />
        <Skeleton width={48} height={42} borderRadius={8} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { height: 16, marginBottom: 12 },
  cardBody: { flex: 1, gap: 8 },
  meta: { marginTop: 4 },
  createRow: { marginTop: 12 },
  input: { flex: 1 },
});
