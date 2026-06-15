import { useAuth as useClerkAuth } from "@clerk/expo";
import { useEffect, useRef } from "react";

import { useAuth as useAppAuth } from "@/lib/auth-context";
import { exchangeClerkSessionForApiToken } from "@/lib/exchange-clerk-session";

/** Échange la session Clerk contre le JWT API quand Clerk est connecté sans token API local. */
export function ClerkSessionBridge() {
  const { isSignedIn, isLoaded, getToken, signOut: clerkSignOut } = useClerkAuth({
    treatPendingAsSignedOut: false,
  });
  const { token, signIn, signOut, skipMeValidation } = useAppAuth();
  const exchangingRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || token || skipMeValidation || exchangingRef.current) {
      return;
    }

    exchangingRef.current = true;

    void exchangeClerkSessionForApiToken(getToken)
      .then((data) => signIn(data.token, data.user))
      .catch((err) => {
        const code = (err as { data?: { code?: string } })?.data?.code;
        if (code === "UNAUTHORIZED") {
          void clerkSignOut();
        }
      })
      .finally(() => {
        exchangingRef.current = false;
      });
  }, [isLoaded, isSignedIn, token, skipMeValidation, getToken, signIn, clerkSignOut]);

  useEffect(() => {
    if (!isLoaded || isSignedIn || !token || skipMeValidation) return;
    void signOut();
  }, [isLoaded, isSignedIn, token, skipMeValidation, signOut]);

  return null;
}
