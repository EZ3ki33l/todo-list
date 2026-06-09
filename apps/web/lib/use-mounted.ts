"use client";

import { useEffect, useState } from "react";

/** True après le premier rendu client (évite les écarts SSR / navigateur). */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
