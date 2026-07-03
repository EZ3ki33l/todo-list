import { useEffect, useState } from "react";

import { trpc } from "@/lib/trpc";

type UseMeValidationParams = {
  token: string | null;
  ready: boolean;
  skipMeValidation: boolean;
  signOut: () => Promise<void>;
};

const ME_VALIDATION_TIMEOUT_MS = 6000;

/**
 * Valide le token stocké localement auprès de l'API (/auth/me).
 *
 * Responsabilités :
 * - Lancer la requête uniquement quand nécessaire
 * - Détecter une réponse UNAUTHORIZED et déclencher signOut
 * - Gérer un timeout pour ne pas bloquer indéfiniment l'affichage
 *
 * Retourne :
 * - `meUnauthorized` : le token est invalide côté serveur
 * - `isPending`      : la validation est en cours (pas encore résolue, ni expirée)
 */
export function useMeValidation({
  token,
  ready,
  skipMeValidation,
  signOut,
}: UseMeValidationParams) {
  const shouldValidate = !!token && ready && !skipMeValidation;

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: shouldValidate,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const meUnauthorized =
    shouldValidate &&
    meQuery.isFetched &&
    (meQuery.error as { data?: { code?: string } } | null)?.data?.code === "UNAUTHORIZED";

  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!shouldValidate || meQuery.isFetched || meQuery.isError) {
      setTimedOut(false);
      return;
    }
    if (!meQuery.isLoading) return;

    const timer = setTimeout(() => setTimedOut(true), ME_VALIDATION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [shouldValidate, meQuery.isLoading, meQuery.isFetched, meQuery.isError]);

  useEffect(() => {
    if (meUnauthorized) void signOut();
  }, [meUnauthorized, signOut]);

  const isPending = shouldValidate && !timedOut && meQuery.isLoading && !meQuery.isFetched;

  return { meUnauthorized, isPending };
}
