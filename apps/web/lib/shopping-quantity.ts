export function parseQuantity(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}
