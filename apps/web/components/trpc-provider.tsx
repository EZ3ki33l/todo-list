"use client";

import { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { trpc, createTrpcClient } from "@/lib/trpc";

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
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
  }, []);

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
    return <p className="text-sm text-gray-400">Chargement…</p>;
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
