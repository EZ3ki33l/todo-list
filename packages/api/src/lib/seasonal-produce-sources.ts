/** Sources publiques françaises pour les calendriers de saison (injectées au prompt). */
export const CANONICAL_SEASONAL_SOURCES = [
  {
    label: "Manger Bouger — Fruits et légumes de saison",
    url: "https://www.mangerbouger.fr/manger-mieux/au-jardin/les-fruits-et-legumes-de-saison",
  },
  {
    label: "Interfel — Calendrier des fruits et légumes",
    url: "https://www.fruit-legume.com/les-fruits-et-legumes-de-saison/",
  },
  {
    label: "Agence Bio — Produits de saison",
    url: "https://www.agencebio.org/les-produits-bio-de-saison/",
  },
] as const;

export function formatSourcesForPrompt(
  sources: ReadonlyArray<{ label: string; url: string }>,
): string {
  return sources.map((s) => `- ${s.label} : ${s.url}`).join("\n");
}
