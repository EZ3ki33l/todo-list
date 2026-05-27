import { useEffect } from "react";

import { useAuth } from "@/lib/auth-context";
import { syncPushTokenIfOptedIn } from "@/lib/push-notifications";
import { trpc } from "@/lib/trpc";

/** Rafraîchit le token uniquement si l'utilisateur a déjà opt-in (pas de demande silencieuse). */
export function PushTokenSync() {
  const { token, ready } = useAuth();
  const registerPush = trpc.notifications.registerPushToken.useMutation();

  useEffect(() => {
    if (!ready || !token) return;
    syncPushTokenIfOptedIn((input) => registerPush.mutateAsync(input)).catch(() => {});
  }, [ready, token]);

  return null;
}
