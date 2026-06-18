import { StyleSheet, View } from "react-native";

import { LoadingLogo } from "@/components/loading-logo";
import { Skeleton, SkeletonLine } from "@/components/skeleton";
import { TodoHubSkeleton } from "@/components/todo-hub-skeleton";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

export function AuthLoadingOverlay() {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);

  return (
    <View style={[styles.overlay, { backgroundColor: palette.bg }]} pointerEvents="auto">
      <View style={styles.logoWrap}>
        <LoadingLogo size={64} />
      </View>
      <View style={styles.preview}>
        <View style={styles.previewHeader}>
          <SkeletonLine width="28%" style={styles.previewTitle} />
          <Skeleton width={72} height={12} borderRadius={6} />
        </View>
        <TodoHubSkeleton withSharedLists={false} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 28,
  },
  preview: {
    flex: 1,
    opacity: 0.85,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  previewTitle: { height: 22 },
});
