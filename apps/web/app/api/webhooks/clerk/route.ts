import { type NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";

import { prisma } from "@repo/db";

type ClerkDeletedUserEvent = {
  type: "user.deleted";
  data: {
    id: string;
  };
};

export async function POST(req: NextRequest) {
  let evt: unknown;

  try {
    evt = await verifyWebhook(req);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 400 });
  }

  if ((evt as { type?: string })?.type !== "user.deleted") {
    return NextResponse.json({ ok: true, handled: false });
  }

  const event = evt as ClerkDeletedUserEvent;
  const clerkId = event.data.id;
  if (!clerkId) {
    return NextResponse.json({ ok: false, error: "missing_clerk_id" }, { status: 400 });
  }

  // Supprime l'utilisateur applicatif ; toutes les données liées sont supprimées
  // automatiquement via les relations Prisma en onDelete: Cascade.
  await prisma.user.deleteMany({
    where: { clerkId },
  });

  return NextResponse.json({ ok: true, handled: true });
}
