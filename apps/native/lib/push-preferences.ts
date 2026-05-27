import * as SecureStore from "expo-secure-store";

const OPT_IN_KEY = "push_notifications_opt_in";
const TOKEN_KEY = "push_expo_token";

export async function isPushOptIn(): Promise<boolean> {
  return (await SecureStore.getItemAsync(OPT_IN_KEY)) === "1";
}

export async function setPushOptIn(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(OPT_IN_KEY, "1");
  } else {
    await SecureStore.deleteItemAsync(OPT_IN_KEY);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setStoredPushToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}
