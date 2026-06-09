import NextAuth from "next-auth";

import { checkRateLimit, getClientIp, rateLimitResponse } from "@repo/api";

import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

function rateLimitApi(req: Request): Response | undefined {
  const { pathname } = new URL(req.url);
  if (!pathname.startsWith("/api/")) return;

  const ip = getClientIp(req);
  const key = pathname.startsWith("/api/auth/")
    ? `proxy:auth:${ip}`
    : `proxy:api:${ip}`;
  const limit = pathname.startsWith("/api/auth/") ? 60 : 300;

  if (!checkRateLimit(key, limit, 60_000)) {
    return rateLimitResponse();
  }
}

export const proxy = auth((req) => {
  const blocked = rateLimitApi(req);
  if (blocked) return blocked;

  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  if (isLoggedIn && (pathname === "/" || pathname === "/login")) {
    return Response.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*", "/api/:path*"],
};
