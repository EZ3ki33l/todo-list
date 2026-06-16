import { useEffect } from "react";
import { ImageStyle, StyleProp, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type LoadingLogoProps = {
  size?: number;
  tintColor?: string;
  style?: StyleProp<ImageStyle>;
};

export function LoadingLogo({ size = 72, tintColor, style }: LoadingLogoProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.Image
      source={require("../assets/logo.png")}
      style={[{ width: size, height: size, tintColor }, style, animatedStyle]}
      accessibilityLabel="Chargement"
    />
  );
}

type LoadingIndicatorProps = {
  size?: number;
  tintColor?: string;
  style?: StyleProp<ViewStyle>;
};

/** Logo animé centré pour les états de chargement de page / liste. */
export function LoadingIndicator({ size = 48, tintColor, style }: LoadingIndicatorProps) {
  return (
    <View style={[{ alignItems: "center", justifyContent: "center", marginVertical: 24 }, style]}>
      <LoadingLogo size={size} tintColor={tintColor} />
    </View>
  );
}
