import { useEffect } from "react";

import { useAuth as useClerkAuth } from "@clerk/expo";

import { useAuth as useAppAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

/** Échange la session Clerk contre le JWT API (tRPC). */
export function ClerkSessionBridge() {
  const { isSignedIn, isLoaded, getToken, signOut: clerkSignOut } = useClerkAuth({
    treatPendingAsSignedOut: false,
  });
  const { token, signIn, signOut } = useAppAuth();
  const exchange = trpc.auth.signInWithClerkToken.useMutation();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || token || exchange.isPending) return;

    let cancelled = false;
    (async () => {
      try {
        const sessionToken = await getToken();
        if (!sessionToken || cancelled) return;
        const data = await exchange.mutateAsync({ sessionToken });
        if (cancelled) return;
        await signIn(data.token, data.user);
      } catch {
        if (!cancelled) {
          await signOut();
          await clerkSignOut();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, token, exchange, getToken, signIn, signOut, clerkSignOut]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn && token) {
      void signOut();
    }
  }, [isLoaded, isSignedIn, token, signOut]);

  return null;
}
