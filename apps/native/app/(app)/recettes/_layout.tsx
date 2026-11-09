import { useMemo } from "react";
import { Stack } from "expo-router";

import { getPalette } from "@repo/theme";
import { useThemeMode } from "@/lib/theme-context";

export default function RecipesLayout() {
  const { themeName } = useThemeMode();
  const palette = useMemo(() => getPalette(themeName), [themeName]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.bgElevated },
        headerTintColor: palette.text,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        headerBackTitle: "Retour",
        contentStyle: { backgroundColor: palette.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[recipeId]" options={{ title: "Recette" }} />
      <Stack.Screen name="catalogue/[mealId]" options={{ title: "Catalogue" }} />
    </Stack>
  );
}
