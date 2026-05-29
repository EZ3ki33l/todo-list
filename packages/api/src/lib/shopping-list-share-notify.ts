import { prisma } from "@repo/db";

import { sendExpoPush } from "./expo-push";

/** Prévient l'invité qu'une liste lui a été partagée (pas d'écran « accepter »). */
export async function notifyShoppingListShared(params: {
  listId: string;
  listTitle: string;
  targetUserId: string;
  sharerName: string | null;
}): Promise<void> {
  const tokens = await prisma.pushToken.findMany({
    where: { userId: params.targetUserId },
    select: { token: true },
  });
  if (tokens.length === 0) return;

  const who = params.sharerName?.trim() || "Quelqu'un";
  const body = `${who} a partagé la liste « ${params.listTitle} » avec vous. Ouvrez l'onglet Courses.`;

  await sendExpoPush(
    tokens.map((t) => ({
      to: t.token,
      title: "Liste de courses partagée",
      body,
      data: { listId: params.listId, type: "list_shared" },
      sound: "default",
    })),
  );
}
