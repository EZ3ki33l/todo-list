import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp } from "@repo/api";
import { ensureUserFromClerk, issueJwt } from "@repo/api/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`auth:trpc-token:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = await ensureUserFromClerk(clerkUserId);
  const token = await issueJwt(user.id);
  return NextResponse.json({ token });
}
