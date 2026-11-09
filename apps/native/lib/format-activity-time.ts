import { activityPathSegments } from "@repo/domain/activity-time";

export { formatActivityTime } from "@repo/domain/activity-time";

export function activityRoute(
  listKind: "TODO" | "SHOPPING" | null | undefined,
  listId: string | null | undefined,
): string | null {
  const segments = activityPathSegments(listKind, listId);
  return segments && `/(app)/${segments}`;
}
