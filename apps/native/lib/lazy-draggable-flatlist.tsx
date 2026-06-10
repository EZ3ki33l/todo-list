import { useEffect, useState, type ComponentType } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export type { RenderItemParams } from "react-native-draggable-flatlist";

type Props = Record<string, unknown>;

/** Charge react-native-draggable-flatlist à l'affichage (évite le require sync des routes Expo). */
export function LazyDraggableFlatList(props: Props) {
  const [Component, setComponent] = useState<ComponentType<Props> | null>(null);

  useEffect(() => {
    void import("react-native-draggable-flatlist").then((mod) => {
      setComponent(() => mod.default as ComponentType<Props>);
    });
  }, []);

  if (!Component) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Component {...props} />;
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
});
