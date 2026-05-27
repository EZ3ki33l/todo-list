import { Platform } from "react-native";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export type StoredUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

async function storeSet(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
  } else {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync(key, value);
  }
}

async function storeGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(key);
  const SecureStore = await import("expo-secure-store");
  return SecureStore.getItemAsync(key);
}

async function storeDelete(key: string) {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
  } else {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.deleteItemAsync(key);
  }
}

export async function saveSession(token: string, user: StoredUser) {
  await storeSet(TOKEN_KEY, token);
  await storeSet(USER_KEY, JSON.stringify(user));
}

export async function getToken(): Promise<string | null> {
  return storeGet(TOKEN_KEY);
}

export async function getUser(): Promise<StoredUser | null> {
  const raw = await storeGet(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as StoredUser; } catch { return null; }
}

export async function clearSession() {
  await storeDelete(TOKEN_KEY);
  await storeDelete(USER_KEY);
}
