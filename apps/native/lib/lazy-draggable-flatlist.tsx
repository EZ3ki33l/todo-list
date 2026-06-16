import { useEffect, useState, type ComponentType } from "react";
import { StyleSheet, View } from "react-native";

import { Skeleton, SkeletonLine } from "@/components/skeleton";

export type { RenderItemParams } from "react-native-draggable-flatlist";

type Props = Record<string, unknown>;

function ListMountSkeleton() {
  return (
    <View style={styles.loader}>
      {[0, 1, 2].map((key) => (
        <View key={key} style={styles.row}>
          <Skeleton width={22} height={22} borderRadius={6} />
          <SkeletonLine width="55%" />
        </View>
      ))}
    </View>
  );
}

/** Charge react-native-draggable-flatlist à l'affichage (évite le require sync des routes Expo). */
export function LazyDraggableFlatList(props: Props) {
  const [Component, setComponent] = useState<ComponentType<Props> | null>(null);

  useEffect(() => {
    void import("react-native-draggable-flatlist").then((mod) => {
      setComponent(() => mod.default as ComponentType<Props>);
    });
  }, []);

  if (!Component) {
    return <ListMountSkeleton />;
  }

  return <Component {...props} />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingVertical: 8,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
