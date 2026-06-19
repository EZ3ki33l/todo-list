"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { activityHref, formatActivityTime } from "@/lib/format-activity-time";
import { useActivitySse } from "@/lib/use-activity-sse";
import { useBrowserAlerts } from "@/lib/use-browser-alerts";
import { trpc } from "@/lib/trpc";

import { HydratableSvg } from "@/components/hydratable-svg";

import { NotificationSettings } from "./notification-settings";

function BellIcon({ className }: { className?: string }) {
  return (
    <HydratableSvg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0"
        suppressHydrationWarning
      />
    </HydratableSvg>
  );
}

type PanelTab = "history" | "settings";

export function ActivityBell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>("history");
  const panelRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const [tabVisible, setTabVisible] = useState(true);
  const [sseActive, setSseActive] = useState(true);

  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const { data: prefs } = trpc.notifications.getPreferences.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });
  useActivitySse(tabVisible && sseActive, {
    onPermanentFailure: () => setSseActive(false),
  });

  const { data: unread } = trpc.activity.unreadCount.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: tabVisible && !sseActive ? 60_000 : false,
  });
  const { data: feed, isLoading } = trpc.activity.list.useQuery(
    { limit: 40 },
    { enabled: open && tab === "history" },
  );

  const markRead = trpc.activity.markRead.useMutation({
    onSuccess: () => {
      void utils.activity.unreadCount.invalidate();
      void utils.activity.list.invalidate();
    },
  });
  const markAllRead = trpc.activity.markAllRead.useMutation({
    onSuccess: () => {
      void utils.activity.unreadCount.invalidate();
      void utils.activity.list.invalidate();
    },
  });

  const alertsActive = prefs?.alertsEnabled ?? true;
  const browserAlertOptions = useMemo(
    () => ({
      popups: alertsActive && (prefs?.browserPopups ?? false),
      titleBadge: alertsActive && (prefs?.browserTitleBadge ?? true),
    }),
    [alertsActive, prefs?.browserPopups, prefs?.browserTitleBadge],
  );
  useBrowserAlerts(unread?.count ?? 0, unread?.latest ?? null, browserAlertOptions);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, close]);

  function handleItemClick(id: string, isUnread: boolean) {
    if (isUnread) markRead.mutate({ id });
    close();
  }

  const count = unread?.count ?? 0;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-1.5 text-app-text-muted hover:bg-app-bg-soft hover:text-app-text"
        aria-label={count > 0 ? `${count} notification(s) non lue(s)` : "Notifications et historique"}
        aria-expanded={open}
      >
        <BellIcon className="size-5" />
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-app-danger px-1 text-[10px] font-semibold text-app-on-primary">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-9 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-app-border-soft bg-app-bg-elevated shadow-lg">
          <div className="flex border-b border-app-border-soft">
            <button
              type="button"
              onClick={() => setTab("history")}
              className={`flex-1 px-3 py-2.5 text-sm font-medium ${
                tab === "history"
                  ? "border-b-2 border-app-primary text-app-text"
                  : "text-app-text-subtle hover:text-app-text"
              }`}
            >
              Historique
            </button>
            <button
              type="button"
              onClick={() => setTab("settings")}
              className={`flex-1 px-3 py-2.5 text-sm font-medium ${
                tab === "settings"
                  ? "border-b-2 border-app-primary text-app-text"
                  : "text-app-text-subtle hover:text-app-text"
              }`}
            >
              Réglages
            </button>
          </div>

          {tab === "history" ? (
            <>
              {count > 0 ? (
                <div className="flex justify-end border-b border-app-border-soft px-3 py-1.5">
                  <button
                    type="button"
                    onClick={() => markAllRead.mutate()}
                    className="text-xs text-app-text-subtle hover:text-app-text"
                    disabled={markAllRead.isPending}
                  >
                    Tout marquer lu
                  </button>
                </div>
              ) : null}

              <div className="max-h-80 overflow-y-auto">
                {isLoading ? (
                  <p className="px-3 py-6 text-center text-sm text-app-text-subtle">Chargement…</p>
                ) : !feed?.items.length ? (
                  <p className="px-3 py-6 text-center text-sm text-app-text-subtle">
                    {alertsActive
                      ? "Aucune modification récente sur vos listes partagées."
                      : "Les notifications sont désactivées. Activez-les dans Réglages."}
                  </p>
                ) : (
                  <ul className="divide-y divide-app-border-soft">
                    {feed.items.map((item) => {
                      const href = activityHref(item.listKind, item.listId);
                      const isUnread = !item.readAt;
                      const inner = (
                        <>
                          <p className="text-sm font-medium text-app-text">{item.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-app-text-muted">{item.body}</p>
                          <p className="mt-1 text-[11px] text-app-text-subtle">
                            {formatActivityTime(item.createdAt)}
                          </p>
                        </>
                      );

                      return (
                        <li key={item.id}>
                          {href ? (
                            <Link
                              href={href}
                              onClick={() => handleItemClick(item.id, isUnread)}
                              className={`block px-3 py-2.5 hover:bg-app-bg-soft ${isUnread ? "bg-blue-50/50" : ""}`}
                            >
                              {inner}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleItemClick(item.id, isUnread)}
                              className={`block w-full px-3 py-2.5 text-left hover:bg-app-bg-soft ${isUnread ? "bg-blue-50/50" : ""}`}
                            >
                              {inner}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
              <NotificationSettings />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
