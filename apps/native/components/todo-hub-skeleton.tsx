import { StyleSheet, useWindowDimensions, View } from "react-native";

import { SharedListsSkeleton } from "@/components/shared-lists-skeleton";
import { Skeleton, SkeletonLine } from "@/components/skeleton";

const STACK_BREAKPOINT = 640;

function TaskColumnSkeleton({ stacked }: { stacked: boolean }) {
  return (
    <View style={[styles.column, stacked && styles.columnStacked]}>
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

  return (
    <View>
      <View style={[styles.grid, stacked && styles.gridStacked]}>
        <TaskColumnSkeleton stacked={stacked} />
        <TaskColumnSkeleton stacked={stacked} />
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

const styles = StyleSheet.create({
  grid: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 20 },
  gridStacked: { flexDirection: "column", gap: 16 },
  column: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden",
  },
  columnStacked: { flex: undefined, width: "100%" },
  columnHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
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
