import { Image, type ImageSourcePropType } from "react-native";

import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

const ICONS = {
  todolist: require("../assets/ez3-todolist.png"),
  caddie: require("../assets/ez3-caddie.png"),
} satisfies Record<string, ImageSourcePropType>;

type TabBarIconName = keyof typeof ICONS;

export function TabBarIcon({
  name,
  focused,
}: {
  name: TabBarIconName;
  focused: boolean;
}) {
  const { themeName } = useThemeMode();
  const { logoTint } = getPalette(themeName);

  return (
    <Image
      source={ICONS[name]}
      style={{
        width: 26,
        height: 26,
        opacity: focused ? 1 : 0.45,
        tintColor: logoTint,
      }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
