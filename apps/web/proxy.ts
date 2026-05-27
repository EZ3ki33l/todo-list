import type { NextFetchEvent, NextRequest } from "next/server";
import NextAuth from "next-auth";

import authConfig from "./auth.config";

const { auth: authHandler } = NextAuth(authConfig);

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return authHandler(request, event);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
