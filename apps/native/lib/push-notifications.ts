import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";

import {
  getStoredPushToken,
  isPushOptIn,
  setPushOptIn,
  setStoredPushToken,
} from "./push-preferences";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PushPermissionStatus = "granted" | "denied" | "undetermined";

export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

function getExpoProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID
  );
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("shopping", {
    name: "Listes de courses",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

type RegisterPush = (input: {
  token: string;
  platform?: "android" | "ios" | "web";
}) => Promise<unknown>;

type UnregisterPush = (input: { token: string }) => Promise<unknown>;

/** Demande la permission système et enregistre le token (opt-in explicite). */
export async function enablePushNotifications(
  registerPush: RegisterPush,
): Promise<{ ok: boolean; permission: PushPermissionStatus; reason?: string }> {
  if (!Device.isDevice) {
    return { ok: false, permission: "denied", reason: "Émulateur non pris en charge" };
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    return {
      ok: false,
      permission: await getPushPermissionStatus(),
      reason: "EXPO_PUBLIC_EAS_PROJECT_ID manquant",
    };
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return {
      ok: false,
      permission: finalStatus === "denied" ? "denied" : "undetermined",
      reason: "Permission refusée",
    };
  }

  await ensureAndroidChannel();

  let pushToken: { data: string };
  try {
    pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("FirebaseApp") ||
      msg.includes("FCM") ||
      msg.includes("google-services") ||
      msg.includes("fcm-credentials")
    ) {
      return {
        ok: false,
        permission: await getPushPermissionStatus(),
        reason:
          "Firebase (FCM) non configuré. Ajoute google-services.json et rebuild l'app (voir DEPLOY.md).",
      };
    }
    throw err;
  }

  const platform =
    Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";

  await registerPush({ token: pushToken.data, platform });
  await setStoredPushToken(pushToken.data);
  await setPushOptIn(true);

  return { ok: true, permission: "granted" };
}

export async function disablePushNotifications(
  unregisterPush: UnregisterPush,
): Promise<void> {
  const token = await getStoredPushToken();
  if (token) {
    try {
      await unregisterPush({ token });
    } catch {
      /* token déjà invalide */
    }
  }
  await setPushOptIn(false);
}

/** Rafraîchit le token si l'utilisateur a déjà opt-in (sans redemander la permission). */
export async function syncPushTokenIfOptedIn(
  registerPush: RegisterPush,
): Promise<void> {
  if (!(await isPushOptIn())) return;
  if ((await getPushPermissionStatus()) !== "granted") return;

  const projectId = getExpoProjectId();
  if (!projectId || !Device.isDevice) return;

  await ensureAndroidChannel();
  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
  const platform =
    Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";

  await registerPush({ token: pushToken.data, platform });
  await setStoredPushToken(pushToken.data);
}

export function openSystemNotificationSettings() {
  void Linking.openSettings();
}
