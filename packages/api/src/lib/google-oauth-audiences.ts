/** Audiences Google acceptées pour les idToken reçus de l'app mobile / web. */
export function allowedGoogleAudiences(env: NodeJS.ProcessEnv = process.env): string[] {
  const values = [
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_ANDROID_CLIENT_ID,
    env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  ].filter((v): v is string => Boolean(v));

  return Array.from(new Set(values));
}
