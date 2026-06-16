import { useEffect } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ width = "100%", height = 14, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.block, { width, height, borderRadius }, style, animatedStyle]}
    />
  );
}

export function SkeletonLine({ width = "100%", style }: { width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  return <Skeleton width={width} height={12} borderRadius={6} style={style} />;
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: "#E5E7EB",
  },
});
