type UseAuthOverlayParams = {
  bootstrapping: boolean;
  meUnauthorized: boolean;
  pendingApiExchange: boolean;
  leavingAuthRoute: boolean;
  authFlowBusy: boolean;
};

type UseAuthOverlayResult = {
  /** Les enfants (shell de navigation) doivent être rendus. */
  showShell: boolean;
  /** L'overlay de chargement doit être affiché par-dessus. */
  showOverlay: boolean;
};

/**
 * Calcule les flags d'affichage de l'AuthGuard.
 *
 * Règles :
 * - `showShell`   : vrai dès que l'état est stable, authentifié et hors route auth
 * - `showOverlay` : vrai dès qu'une transition est en cours (ou que le shell est masqué)
 *
 * Hook pur : aucun side effect, aucune mutation d'état.
 */
export function useAuthOverlay({
  bootstrapping,
  meUnauthorized,
  pendingApiExchange,
  leavingAuthRoute,
  authFlowBusy,
}: UseAuthOverlayParams): UseAuthOverlayResult {
  const renderChildren = !meUnauthorized;
  const showShell = renderChildren && !leavingAuthRoute && !bootstrapping;

  const showLoadingOverlay =
    bootstrapping || meUnauthorized || pendingApiExchange || leavingAuthRoute || authFlowBusy;

  // Filet de sécurité : évite un écran blanc si le shell est masqué sans overlay explicite.
  const showOverlay = showLoadingOverlay || !showShell;

  return { showShell, showOverlay };
}
