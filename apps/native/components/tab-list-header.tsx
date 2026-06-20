import { Image, type ImageSourcePropType } from "react-native";
import { useMemo } from "react";
import { XStack } from "tamagui";

import { getPalette } from "@repo/theme";

import { useThemeMode } from "@/lib/theme-context";

type Props = {
  logoName: "todolist" | "caddie";
};

const LOGOS = {
  todolist: require("../assets/ez3-todolist.png"),
  caddie: require("../assets/ez3-caddie.png"),
} satisfies Record<"todolist" | "caddie", ImageSourcePropType>;

export function TabListHeader({ logoName }: Props) {
  const { themeName } = useThemeMode();
  const palette = useMemo(() => getPalette(themeName), [themeName]);

  return (
    <XStack justifyContent="center" alignItems="center" marginBottom={10}>
      <Image
        source={LOGOS[logoName]}
        style={{
          width: 46,
          height: 46,
          tintColor: palette.logoTint ?? palette.text,
          opacity: 0.95,
        }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </XStack>
  );
}
