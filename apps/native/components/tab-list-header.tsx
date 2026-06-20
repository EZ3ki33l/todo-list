import { useMemo } from "react";
import { Text, XStack } from "tamagui";

import { getPalette } from "@repo/theme";

import { ActivityBell } from "@/components/activity-bell";
import { UserMenu } from "@/components/user-menu";
import { useThemeMode } from "@/lib/theme-context";

type Props = {
  title: string;
  /** @deprecated — La déconnexion est maintenant dans UserMenu */
  onSignOut?: () => void;
};

export function TabListHeader({ title }: Props) {
  const { themeName } = useThemeMode();
  const palette = useMemo(() => getPalette(themeName), [themeName]);

  return (
    <XStack justifyContent="space-between" alignItems="center" marginBottom={20}>
      <Text fontSize={24} fontWeight="700" color={palette.text}>
        {title}
      </Text>
      <XStack alignItems="center" gap={12}>
        <ActivityBell />
        <UserMenu />
      </XStack>
    </XStack>
  );
}
