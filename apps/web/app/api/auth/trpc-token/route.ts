import { NextResponse } from "next/server";

import { issueJwt } from "@repo/api";

import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const token = await issueJwt(session.user.id);
  return NextResponse.json({ token });
}
