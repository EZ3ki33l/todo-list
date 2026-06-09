import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp, issueJwt } from "@repo/api";

import { auth } from "@/auth";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`auth:trpc-token:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const token = await issueJwt(session.user.id);
  return NextResponse.json({ token });
}
