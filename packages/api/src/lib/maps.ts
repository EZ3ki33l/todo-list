/** URL universelle pour ouvrir une recherche / navigation vers une adresse. */
export function buildMapsSearchUrl(address: string): string {
  const query = encodeURIComponent(address.trim());
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/** Texte affiché pour le lieu (étiquette seule, adresse seule, ou les deux). */
export function formatActionLocation(
  locationLabel: string | null | undefined,
  locationAddress: string | null | undefined,
): string | null {
  const label = locationLabel?.trim();
  const address = locationAddress?.trim();
  if (label && address) return `${label} — ${address}`;
  return label || address || null;
}

/** Adresse utilisée pour la navigation (priorité à l'adresse complète). */
export function resolveMapsQuery(
  locationLabel: string | null | undefined,
  locationAddress: string | null | undefined,
): string | null {
  const address = locationAddress?.trim();
  if (address) return address;
  const label = locationLabel?.trim();
  return label || null;
}
