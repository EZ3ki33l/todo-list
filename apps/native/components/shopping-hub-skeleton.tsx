import { StyleSheet, View } from "react-native";

import { SharedListsSkeleton } from "@/components/shared-lists-skeleton";
import { Skeleton, SkeletonLine } from "@/components/skeleton";

function ShoppingItemSkeleton() {
  return (
    <View style={styles.itemRow}>
      <Skeleton width={22} height={22} borderRadius={6} />
      <Skeleton width={24} height={24} borderRadius={6} />
      <View style={styles.itemText}>
        <SkeletonLine width="62%" />
        <SkeletonLine width="28%" style={styles.itemMeta} />
      </View>
    </View>
  );
}

export function ShoppingHubSkeleton({ withSharedLists = false }: { withSharedLists?: boolean }) {
  return (
    <View style={styles.wrap}>
      <Skeleton height={88} borderRadius={10} style={styles.addCard} />
      {[0, 1, 2, 3, 4].map((key) => (
        <ShoppingItemSkeleton key={key} />
      ))}
      {withSharedLists ? <SharedListsSkeleton /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  addCard: { marginBottom: 16 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  itemText: { flex: 1, gap: 6 },
  itemMeta: { marginTop: 2 },
});
