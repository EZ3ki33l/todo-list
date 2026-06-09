"use client";

import { useEffect, useRef } from "react";

const BASE_TITLE = "Todo list";

function formatPageTitle(unreadCount: number): string {
  if (unreadCount <= 0) return BASE_TITLE;
  const label =
    unreadCount === 1 ? "1 alerte" : `${unreadCount} alertes`;
  return `(${unreadCount}) ${label} | ${BASE_TITLE}`;
}

export async function requestBrowserAlertPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

type LatestAlert = {
  id: string;
  title: string;
  body: string;
} | null;

type BrowserAlertOptions = {
  popups: boolean;
  titleBadge: boolean;
};

export function useBrowserAlerts(
  unreadCount: number,
  latest: LatestAlert,
  options: BrowserAlertOptions,
) {
  const prevCountRef = useRef(unreadCount);
  const lastNotifiedIdRef = useRef<string | null>(null);

  useEffect(() => {
    document.title = options.titleBadge
      ? formatPageTitle(unreadCount)
      : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [unreadCount, options.titleBadge]);

  useEffect(() => {
    if (!options.popups) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (unreadCount <= prevCountRef.current) {
      prevCountRef.current = unreadCount;
      return;
    }

    if (latest && latest.id !== lastNotifiedIdRef.current) {
      lastNotifiedIdRef.current = latest.id;
      try {
        new Notification(latest.title, {
          body: latest.body,
          tag: latest.id,
        });
      } catch {
        /* navigateur sans support complet */
      }
    }

    prevCountRef.current = unreadCount;
  }, [unreadCount, latest, options.popups]);
}
