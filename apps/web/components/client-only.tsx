"use client";

import { useMounted } from "@/lib/use-mounted";

export function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const mounted = useMounted();
  if (!mounted) return fallback;
  return children;
}
