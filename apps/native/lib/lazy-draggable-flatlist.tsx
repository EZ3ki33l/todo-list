import { useEffect, useMemo, useState, type ComponentType } from "react";
import { StyleSheet, View } from "react-native";

import { Skeleton, SkeletonLine } from "@/components/skeleton";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

export type { RenderItemParams } from "react-native-draggable-flatlist";

type Props = Record<string, unknown>;

function ListMountSkeleton() {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        loader: {
          flex: 1,
          backgroundColor: palette.bg,
          paddingVertical: 8,
          gap: 8,
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: palette.bgElevated,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: palette.borderSoft,
          paddingHorizontal: 12,
          paddingVertical: 12,
        },
      }),
    [palette],
  );

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
