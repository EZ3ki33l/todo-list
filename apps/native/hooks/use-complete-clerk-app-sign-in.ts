import { useAuth as useClerkAuth } from "@clerk/expo";
import { useCallback } from "react";

import { useAuth as useAppAuth } from "@/lib/auth-context";
import { exchangeClerkSessionForApiToken } from "@/lib/exchange-clerk-session";

function formatExchangeError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Impossible de finaliser la connexion";
}

/** Échange la session Clerk active contre le JWT API et met à jour auth-context. */
export function useCompleteClerkAppSignIn() {
  const { getToken } = useClerkAuth({ treatPendingAsSignedOut: false });
  const { token, signIn: appSignIn } = useAppAuth();

  return useCallback(async () => {
    if (token) return;

    try {
      const data = await exchangeClerkSessionForApiToken(getToken);
      await appSignIn(data.token, data.user);
    } catch (err) {
      const code = (err as { data?: { code?: string } })?.data?.code;
      if (code === "UNAUTHORIZED" || code === "TOO_MANY_REQUESTS") {
        throw err;
      }
      throw new Error(formatExchangeError(err));
    }
  }, [token, getToken, appSignIn]);
}
