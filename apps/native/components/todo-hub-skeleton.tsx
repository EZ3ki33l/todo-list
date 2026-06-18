import { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { SharedListsSkeleton } from "@/components/shared-lists-skeleton";
import { Skeleton, SkeletonLine } from "@/components/skeleton";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette, type AppPalette } from "@/lib/theme-palette";

const STACK_BREAKPOINT = 640;

function createStyles(palette: AppPalette, stacked: boolean) {
  return StyleSheet.create({
    grid: {
      flexDirection: stacked ? "column" : "row",
      gap: stacked ? 16 : 12,
      alignItems: "flex-start",
      marginBottom: 20,
    },
    column: {
      flex: stacked ? undefined : 1,
      width: stacked ? "100%" : undefined,
      backgroundColor: palette.bgElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.borderSoft,
      overflow: "hidden",
    },
    columnHeader: {
      borderBottomWidth: 1,
      borderBottomColor: palette.bgSoft,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
    },
    title: { height: 16 },
    subtitle: { height: 12 },
    columnBody: { paddingHorizontal: 10, paddingVertical: 12, gap: 12 },
    taskRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    addForm: { marginBottom: 20 },
  });
}

function TaskColumnSkeleton({ styles }: { styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.column}>
      <View style={styles.columnHeader}>
        <SkeletonLine width="48%" style={styles.title} />
        <SkeletonLine width="72%" style={styles.subtitle} />
      </View>
      <View style={styles.columnBody}>
        {[0, 1, 2].map((key) => (
          <View key={key} style={styles.taskRow}>
            <Skeleton width={22} height={22} borderRadius={6} />
            <SkeletonLine width={`${68 - key * 8}%`} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function TodoHubSkeleton({
  withSharedLists = true,
  columnsOnly = false,
}: {
  withSharedLists?: boolean;
  columnsOnly?: boolean;
}) {
  const { width } = useWindowDimensions();
  const stacked = width < STACK_BREAKPOINT;
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const styles = useMemo(() => createStyles(palette, stacked), [palette, stacked]);

  return (
    <View>
      <View style={styles.grid}>
        <TaskColumnSkeleton styles={styles} />
        <TaskColumnSkeleton styles={styles} />
      </View>

      {!columnsOnly ? (
        <View style={styles.addForm}>
          <Skeleton height={44} borderRadius={8} />
        </View>
      ) : null}

      {withSharedLists ? <SharedListsSkeleton /> : null}
    </View>
  );
}
