import { useAuth as useClerkAuth } from "@clerk/expo";
import { useUser as useClerkUser } from "@clerk/expo";
import { useEffect, useRef } from "react";

import { useAuth as useAppAuth } from "@/lib/auth-context";
import { exchangeClerkSessionForApiToken } from "@/lib/exchange-clerk-session";

/** Échange la session Clerk contre le JWT API quand Clerk est connecté sans token API local. */
export function ClerkSessionBridge() {
  const { isSignedIn, isLoaded, getToken, signOut: clerkSignOut } = useClerkAuth({
    treatPendingAsSignedOut: false,
  });
  const { user: clerkUser, isLoaded: clerkUserLoaded } = useClerkUser();
  const { token, user, signIn, updateUser, signOut, skipMeValidation } = useAppAuth();
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

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !clerkUserLoaded || !clerkUser || !user) return;

    // ⚠️ Ne jamais remplacer l'ID applicatif (Prisma cuid) par l'ID Clerk.
    // On ne synchronise ici que les champs de profil.
    const nextUser = {
      id: user.id,
      name: clerkUser.fullName ?? null,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
      image: clerkUser.imageUrl ?? null,
    };

    const same =
      user.id === nextUser.id &&
      user.name === nextUser.name &&
      user.email === nextUser.email &&
      user.image === nextUser.image;

    if (!same) {
      void updateUser(nextUser);
    }
  }, [isLoaded, isSignedIn, clerkUserLoaded, clerkUser, user, updateUser]);

  useEffect(() => {
    // Auto-réparation : si une ancienne session a un id local au format Clerk (`user_xxx`),
    // on rééchange la session Clerk pour récupérer le vrai user id applicatif.
    if (!isLoaded || !isSignedIn || !token || skipMeValidation || exchangingRef.current) return;
    if (!user?.id?.startsWith("user_")) return;

    exchangingRef.current = true;
    void exchangeClerkSessionForApiToken(getToken)
      .then((data) => signIn(data.token, data.user))
      .finally(() => {
        exchangingRef.current = false;
      });
  }, [isLoaded, isSignedIn, token, skipMeValidation, user?.id, getToken, signIn]);

  return null;
}
