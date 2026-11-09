/** Quantité saisie par l'utilisateur (« 2,5 ») → nombre strictement positif, sinon null. */
export function parseQuantity(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}
