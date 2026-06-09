import { prisma } from "@repo/db";

export type ActivityUnreadSnapshot = {
  count: number;
  latest: {
    id: string;
    title: string;
    body: string;
    createdAt: Date;
  } | null;
};

export async function getActivityUnreadSnapshot(
  userId: string,
): Promise<ActivityUnreadSnapshot> {
  const [count, latest] = await Promise.all([
    prisma.activityEvent.count({
      where: { userId, readAt: null },
    }),
    prisma.activityEvent.findFirst({
      where: { userId, readAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, body: true, createdAt: true },
    }),
  ]);
  return { count, latest };
}
