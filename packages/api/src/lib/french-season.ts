const MONTH_NAMES = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

export type FrenchSeason = "printemps" | "été" | "automne" | "hiver";

export function getFrenchSeason(month: number): FrenchSeason {
  if (month >= 3 && month <= 5) return "printemps";
  if (month >= 6 && month <= 8) return "été";
  if (month >= 9 && month <= 11) return "automne";
  return "hiver";
}

export function getFrenchSeasonContext(date = new Date()) {
  const month = date.getMonth() + 1;
  const season = getFrenchSeason(month);
  const monthName = MONTH_NAMES[date.getMonth()];
  return {
    season,
    month,
    monthName,
    year: date.getFullYear(),
    label: `${monthName} ${date.getFullYear()}`,
  };
}
