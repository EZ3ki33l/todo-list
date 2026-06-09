import { prisma } from "@repo/db";

export async function countUserWebPushSubscriptions(userId: string): Promise<number> {
  try {
    const delegate = (
      prisma as { webPushSubscription?: { count: (args: unknown) => Promise<number> } }
    ).webPushSubscription;
    if (!delegate?.count) return 0;
    return await delegate.count({ where: { userId } });
  } catch (err) {
    console.error("[notif] webPushSubscription.count", err);
    return 0;
  }
}
