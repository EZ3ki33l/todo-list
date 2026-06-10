let relativeTimeFormatter: Intl.RelativeTimeFormat | null | undefined;

function getRelativeTimeFormatter(): Intl.RelativeTimeFormat | null {
  if (relativeTimeFormatter !== undefined) return relativeTimeFormatter;
  try {
    if (typeof Intl !== "undefined" && typeof Intl.RelativeTimeFormat === "function") {
      relativeTimeFormatter = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
      return relativeTimeFormatter;
    }
  } catch {
    /* Hermes / certains Android : RelativeTimeFormat indisponible */
  }
  relativeTimeFormatter = null;
  return null;
}

function formatRelative(value: number, unit: Intl.RelativeTimeFormatUnit): string {
  const rtf = getRelativeTimeFormatter();
  if (rtf) return rtf.format(value, unit);

  const n = Math.abs(value);
  const prefix = value < 0 ? "il y a " : "dans ";
  switch (unit) {
    case "second":
      return `${prefix}${n} s`;
    case "minute":
      return `${prefix}${n} min`;
    case "hour":
      return `${prefix}${n} h`;
    case "day":
      return `${prefix}${n} j`;
    default:
      return `${prefix}${n}`;
  }
}

export function formatActivityTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);

  if (abs < 60) return formatRelative(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return formatRelative(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return formatRelative(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffDay) < 7) return formatRelative(diffDay, "day");

  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function activityRoute(
  listKind: "TODO" | "SHOPPING" | null | undefined,
  listId: string | null | undefined,
): string | null {
  if (!listId || !listKind) return null;
  if (listKind === "SHOPPING") return `/(app)/shopping/${listId}`;
  return `/(app)/lists/${listId}`;
}
