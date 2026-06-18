import type { ConfigContext, ExpoConfig } from "expo/config";
import fs from "node:fs";
import path from "node:path";

// Expo charge .env avant app.config ; expose les IDs Google dans extra pour @clerk/expo (node_modules).
export default ({ config }: ConfigContext): ExpoConfig => {
  const appJson = require("./app.json") as { expo: ExpoConfig };
  const easProjectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    appJson.expo.extra?.eas?.projectId ||
    "7880f051-0127-48d4-a656-b19916a7e1f4";
  const googleServicesPath = path.join(__dirname, "android/app/google-services.json");
  const hasGoogleServicesFile = fs.existsSync(googleServicesPath);
  const android = appJson.expo.android
    ? {
        ...appJson.expo.android,
        ...(hasGoogleServicesFile ? {} : { googleServicesFile: undefined }),
      }
    : undefined;

  const existingPlugins = (config as ExpoConfig).plugins ?? appJson.expo.plugins ?? [];
  const hasEdgeToEdgePlugin = existingPlugins.some((plugin) => {
    if (typeof plugin === "string") return plugin === "react-native-edge-to-edge";
    if (Array.isArray(plugin)) return plugin[0] === "react-native-edge-to-edge";
    return false;
  });

  return {
    ...appJson.expo,
    ...config,
    ...(android ? { android } : {}),
    extra: {
      ...config.extra,
      ...appJson.expo.extra,
      eas: { projectId: easProjectId },
      EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID:
        process.env.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID,
      EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID:
        process.env.EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID,
    },
    plugins: hasEdgeToEdgePlugin
      ? existingPlugins
      : [
          ...existingPlugins,
          [
            "react-native-edge-to-edge",
            {
              android: {
                parentTheme: "Default",
                enforceNavigationBarContrast: false,
              },
            },
          ],
        ],
  };
};
