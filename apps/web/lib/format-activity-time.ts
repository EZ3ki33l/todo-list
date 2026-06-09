const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

export function formatActivityTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);

  if (abs < 60) return rtf.format(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffDay) < 7) return rtf.format(diffDay, "day");

  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function activityHref(
  listKind: "TODO" | "SHOPPING" | null | undefined,
  listId: string | null | undefined,
): string | null {
  if (!listId || !listKind) return null;
  if (listKind === "SHOPPING") return `/dashboard/shopping/${listId}`;
  return `/dashboard/lists/${listId}`;
}
