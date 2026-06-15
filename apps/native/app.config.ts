import type { ConfigContext, ExpoConfig } from "expo/config";

// Expo charge .env avant app.config ; expose les IDs Google dans extra pour @clerk/expo (node_modules).
export default ({ config }: ConfigContext): ExpoConfig => {
  const appJson = require("./app.json") as { expo: ExpoConfig };

  return {
    ...appJson.expo,
    ...config,
    extra: {
      ...appJson.expo.extra,
      EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID:
        process.env.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID,
    },
  };
};
