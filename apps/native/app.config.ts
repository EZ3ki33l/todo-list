import type { ConfigContext, ExpoConfig } from "expo/config";
import fs from "node:fs";
import path from "node:path";

// Expo charge .env avant app.config ; expose les IDs Google dans extra pour @clerk/expo (node_modules).
export default ({ config }: ConfigContext): ExpoConfig => {
  const appJson = require("./app.json") as { expo: ExpoConfig };
  const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const googleServicesPath = path.join(__dirname, "android/app/google-services.json");
  const hasGoogleServicesFile = fs.existsSync(googleServicesPath);
  const android = appJson.expo.android
    ? {
        ...appJson.expo.android,
        ...(hasGoogleServicesFile ? {} : { googleServicesFile: undefined }),
      }
    : undefined;

  return {
    ...appJson.expo,
    ...config,
    ...(android ? { android } : {}),
    extra: {
      ...appJson.expo.extra,
      ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
      EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID:
        process.env.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID,
      EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID:
        process.env.EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID,
    },
  };
};
