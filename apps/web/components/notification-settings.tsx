"use client";

import { NOTIFICATION_TYPE_OPTIONS } from "@repo/api/notification-constants";

import { requestBrowserAlertPermission } from "@/lib/use-browser-alerts";
import { subscribeWebPush, unsubscribeWebPush } from "@/lib/web-push-subscribe";
import { trpc } from "@/lib/trpc";

type Prefs = {
  alertsEnabled: boolean;
  shoppingItemsAdded: boolean;
  shoppingListShared: boolean;
  todoListShared: boolean;
  browserPopups: boolean;
  browserTitleBadge: boolean;
  pushRegistered?: boolean;
  webPushRegistered?: boolean;
  vapidPublicKey?: string | null;
};

export function NotificationSettings() {
  const utils = trpc.useUtils();
  const {
    data: prefs,
    isPending,
    isError,
    refetch,
  } = trpc.notifications.getPreferences.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });

  const update = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      void utils.notifications.getPreferences.invalidate();
      void utils.activity.unreadCount.invalidate();
    },
  });

  const registerWebPush = trpc.notifications.registerWebPush.useMutation({
    onSuccess: () => void utils.notifications.getPreferences.invalidate(),
  });
  const unregisterWebPushMutation = trpc.notifications.unregisterWebPush.useMutation({
    onSuccess: () => void utils.notifications.getPreferences.invalidate(),
  });

  function patch(partial: Partial<Prefs>) {
    update.mutate(partial);
  }

  async function toggleBrowserPopups(enabled: boolean) {
    if (enabled) {
      const perm = await requestBrowserAlertPermission();
      if (perm !== "granted") return;
      patch({ browserPopups: true });
      const vapid = prefs?.vapidPublicKey;
      if (vapid) {
        await subscribeWebPush(vapid, (input) => registerWebPush.mutateAsync(input));
      }
      return;
    }
    await unsubscribeWebPush((input) => unregisterWebPushMutation.mutateAsync(input));
    patch({ browserPopups: false });
  }

  if (isPending && prefs === undefined) {
    return <p className="px-3 py-6 text-center text-sm text-app-text-subtle">Chargement…</p>;
  }

  if (isError || !prefs) {
    return (
      <div className="px-3 py-6 text-center text-sm">
        <p className="text-app-danger">Impossible de charger les réglages.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-2 text-app-text-muted underline hover:text-app-text"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const typesDisabled = !prefs.alertsEnabled || update.isPending;

  return (
    <div className="px-3 py-3 text-sm">
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-app-border-soft bg-app-bg-soft px-3 py-3">
        <input
          type="checkbox"
          checked={prefs.alertsEnabled}
          onChange={(e) => patch({ alertsEnabled: e.target.checked })}
          disabled={update.isPending}
          className="mt-0.5 rounded border-app-border"
        />
        <span>
          <span className="font-medium text-app-text">Recevoir des notifications</span>
          <span className="mt-0.5 block text-xs text-app-text-subtle">
            Désactivé = plus d&apos;alertes ni d&apos;historique pour les types ci-dessous.
          </span>
        </span>
      </label>

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-app-text-subtle">
        Types de notifications
      </p>
      <ul className="space-y-2">
        {NOTIFICATION_TYPE_OPTIONS.map((opt) => (
          <li key={opt.key}>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 ${
                typesDisabled ? "border-app-border-soft opacity-50" : "border-app-border-soft"
              }`}
            >
              <input
                type="checkbox"
                checked={prefs[opt.key]}
                onChange={(e) => patch({ [opt.key]: e.target.checked })}
                disabled={typesDisabled}
                className="mt-0.5 rounded border-app-border"
              />
              <span>
                <span className="font-medium text-app-text">{opt.label}</span>
                <span className="mt-0.5 block text-xs text-app-text-subtle">{opt.description}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-app-text-subtle">
        Sur le navigateur
      </p>
      <ul className="space-y-2">
        <li>
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 ${
              !prefs.alertsEnabled ? "border-app-border-soft opacity-50" : "border-app-border-soft"
            }`}
          >
            <input
              type="checkbox"
              checked={prefs.browserPopups}
              onChange={(e) => void toggleBrowserPopups(e.target.checked)}
              disabled={!prefs.alertsEnabled || update.isPending}
              className="rounded border-app-border"
            />
            <span className="text-app-text">Popups du navigateur</span>
          </label>
        </li>
        <li>
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 ${
              !prefs.alertsEnabled ? "border-app-border-soft opacity-50" : "border-app-border-soft"
            }`}
          >
            <input
              type="checkbox"
              checked={prefs.browserTitleBadge}
              onChange={(e) => patch({ browserTitleBadge: e.target.checked })}
              disabled={!prefs.alertsEnabled || update.isPending}
              className="rounded border-app-border"
            />
            <span className="text-app-text">Compteur dans le titre de l&apos;onglet</span>
          </label>
        </li>
      </ul>
    </div>
  );
}
