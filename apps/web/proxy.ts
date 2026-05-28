import NextAuth from "next-auth";

import authConfig from "./auth.config";

export const { auth } = NextAuth(authConfig);

export const proxy = auth;

export const config = {
  matcher: ["/dashboard/:path*"],
};
