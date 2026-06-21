"use client";

import { useEffect, useRef } from "react";

import { trpc } from "@/lib/trpc";

type Options = {
  onPermanentFailure?: () => void;
};

/** Met à jour le cache unreadCount via SSE (remplace le polling). */
export function useActivitySse(enabled: boolean, options?: Options) {
  const utils = trpc.useUtils();
  const onPermanentFailureRef = useRef(options?.onPermanentFailure);
  useEffect(() => {
    onPermanentFailureRef.current = options?.onPermanentFailure;
  });

  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;

    let es: EventSource | null = null;
    let retryMs = 3_000;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let failedAttempts = 0;
    let cancelled = false;

    function clearRetry() {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    }

    function scheduleRetry() {
      clearRetry();
      failedAttempts += 1;
      if (failedAttempts >= 5) {
        onPermanentFailureRef.current?.();
        return;
      }
      retryTimer = setTimeout(() => void connect(), retryMs);
      retryMs = Math.min(retryMs * 2, 60_000);
    }

    async function connect() {
      if (cancelled) return;
      es?.close();
      es = null;

      try {
        const tokenRes = await fetch("/api/auth/trpc-token");
        if (!tokenRes.ok) {
          scheduleRetry();
          return;
        }
        const { token } = (await tokenRes.json()) as { token: string };
        if (!token || cancelled) return;

        es = new EventSource(
          `/api/activity/stream?token=${encodeURIComponent(token)}`,
        );

        es.onopen = () => {
          failedAttempts = 0;
          retryMs = 3_000;
        };

        es.onmessage = (event) => {
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
          scheduleRetry();
        };
      } catch {
        scheduleRetry();
      }
    }

    void connect();

    return () => {
      cancelled = true;
      clearRetry();
      es?.close();
    };
  }, [enabled, utils.activity.unreadCount]);
}
