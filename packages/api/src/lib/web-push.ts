import "server-only";

import webpush from "web-push";

import { prisma } from "@repo/db";

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:notifications@todolist.local",
    publicKey,
    privateKey,
  );
  vapidConfigured = true;
  return true;
}

export async function sendWebPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  if (userIds.length === 0 || !ensureVapidConfigured()) return;

  const [subs, prefs] = await Promise.all([
    prisma.webPushSubscription.findMany({
      where: { userId: { in: userIds } },
    }),
    prisma.notificationPreferences.findMany({
      where: {
        userId: { in: userIds },
        alertsEnabled: true,
        browserPopups: true,
      },
      select: { userId: true },
    }),
  ]);

  const allowed = new Set(prefs.map((p) => p.userId));
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
  });

  await Promise.allSettled(
    subs
      .filter((sub) => allowed.has(sub.userId))
      .map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            body,
          );
        } catch (err: unknown) {
          const status =
            err && typeof err === "object" && "statusCode" in err
              ? (err as { statusCode?: number }).statusCode
              : undefined;
          if (status === 404 || status === 410) {
            await prisma.webPushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
          } else {
            console.error("[web-push] send error", err);
          }
        }
      }),
  );
}
