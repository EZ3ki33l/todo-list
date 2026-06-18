import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp, rateLimitResponse } from "@repo/api";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login",
  "/sign-up",
  "/politique-de-confidentialite",
  "/api/trpc(.*)",
]);

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

export const proxy = clerkMiddleware(async (auth, req) => {
  const blocked = rateLimitApi(req);
  if (blocked) return blocked;

  if (!isPublicRoute(req)) {
    await auth.protect({ unauthenticatedUrl: new URL("/login", req.url).toString() });
  }

  const { userId } = await auth();
  const { pathname } = req.nextUrl;
  if (userId && (pathname === "/" || pathname === "/login" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
