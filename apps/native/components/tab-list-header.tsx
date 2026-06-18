import { Pressable } from "react-native";
import { Text, View, XStack } from "tamagui";

import { ActivityBell } from "@/components/activity-bell";
import { useThemeMode } from "@/lib/theme-context";
import { getPalette } from "@/lib/theme-palette";

type Props = {
  title: string;
  onSignOut?: () => void;
};

export function TabListHeader({ title, onSignOut }: Props) {
  const { themeName, toggleTheme } = useThemeMode();
  const palette = getPalette(themeName);

  return (
    <XStack justifyContent="space-between" alignItems="center" marginBottom={20}>
      <Text fontSize={24} fontWeight="700" color={palette.text}>
        {title}
      </Text>
      <XStack alignItems="center" gap={10}>
        <Pressable onPress={toggleTheme} hitSlop={8}>
          <Text fontSize={16}>{themeName === "latte" ? "🌙" : "🌤️"}</Text>
        </Pressable>
        <ActivityBell />
        {onSignOut ? (
          <Pressable onPress={onSignOut} hitSlop={8}>
            <Text fontSize={13} color={palette.textMuted}>
              Déconnexion
            </Text>
          </Pressable>
        ) : (
          <View width={72} />
        )}
      </XStack>
    </XStack>
  );
}
