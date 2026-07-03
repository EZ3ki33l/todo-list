import { useEffect } from "react";
import { useRouter } from "expo-router";

type UseAuthRedirectParams = {
  bootstrapping: boolean;
  meUnauthorized: boolean;
  token: string | null;
  segment: string | undefined;
  setAuthFlowBusy: (busy: boolean) => void;
  router: ReturnType<typeof useRouter>;
};

/**
 * Gère toutes les redirections liées à l'état d'authentification.
 *
 * Responsabilités :
 * - Rediriger vers /(auth)/login si l'utilisateur n'est pas connecté
 * - Rediriger vers /(app) si l'utilisateur est connecté mais hors de l'app
 * - Réinitialiser authFlowBusy une fois l'utilisateur correctement dans /(app)
 *
 * Hook sans valeur de retour : effets de bord uniquement.
 */
export function useAuthRedirect({
  bootstrapping,
  meUnauthorized,
  token,
  segment,
  setAuthFlowBusy,
  router,
}: UseAuthRedirectParams) {
  useEffect(() => {
    if (token && segment === "(app)") {
      setAuthFlowBusy(false);
    }
  }, [token, segment, setAuthFlowBusy]);

  useEffect(() => {
    if (bootstrapping || meUnauthorized) return;

    if (!token) {
      if (segment !== "(auth)") {
        router.replace("/(auth)/login");
      }
      return;
    }

    if (segment !== "(app)") {
      router.replace("/(app)");
    }
  }, [bootstrapping, meUnauthorized, token, segment, router]);
}
