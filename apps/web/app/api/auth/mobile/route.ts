import { type NextRequest } from "next/server";

export function GET(req: NextRequest) {
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const callbackUrl = `${baseUrl}/api/auth/mobile/callback`;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid profile email",
    access_type: "offline",
    prompt: "select_account",
  });

  return Response.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  );
}
