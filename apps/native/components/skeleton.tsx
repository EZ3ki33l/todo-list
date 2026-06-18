import { useEffect } from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ width = "100%", height = 14, borderRadius = 8, style }: SkeletonProps) {
  const { themeName } = useThemeMode();
  const palette = getPalette(themeName);
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.95, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.block,
        style,
        { width, height, borderRadius, backgroundColor: palette.skeleton },
        animatedStyle,
      ]}
    />
  );
}

export function SkeletonLine({ width = "100%", style }: { width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  return <Skeleton width={width} height={12} borderRadius={6} style={style} />;
}

const styles = StyleSheet.create({
  block: {},
});
