"use client";

import { useEffect } from "react";

import { trpc } from "@/lib/trpc";

/** Met à jour le cache unreadCount via SSE (remplace le polling). */
export function useActivitySse(enabled: boolean) {
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;

    let es: EventSource | null = null;
    let retryMs = 3_000;

    function connect() {
      es?.close();
      es = new EventSource("/api/activity/stream");

      es.onmessage = (event) => {
        retryMs = 3_000;
        try {
          const data = JSON.parse(event.data) as {
            count: number;
            latest: { id: string; title: string; body: string; createdAt: string } | null;
          };
          utils.activity.unreadCount.setData(undefined, data);
        } catch {
          /* ignore malformed payload */
        }
      };

      es.onerror = () => {
        es?.close();
        es = null;
        window.setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 60_000);
      };
    }

    connect();

    return () => {
      es?.close();
    };
  }, [enabled, utils.activity.unreadCount]);
}
