"use client";

import { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { DayWeekViewSkeleton } from "@/components/dashboard-skeleton";
import { trpc, createTrpcClient } from "@/lib/trpc";

export function TrpcProvider({
  children,
  initialToken,
}: {
  children: React.ReactNode;
  initialToken?: string | null;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  const [token, setToken] = useState<string | null>(initialToken ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (token) return;

    let cancelled = false;
    fetch("/api/auth/trpc-token")
      .then((res) => {
        if (!res.ok) throw new Error("token");
        return res.json() as Promise<{ token: string }>;
      })
      .then((data) => {
        if (!cancelled) setToken(data.token);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const trpcClient = useMemo(
    () => (token ? createTrpcClient(() => token) : null),
    [token],
  );

  if (failed) {
    return (
      <p className="text-sm text-red-600">
        Impossible de charger les données. Reconnectez-vous.
      </p>
    );
  }

  if (!trpcClient) {
    return <DayWeekViewSkeleton />;
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
