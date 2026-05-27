import { SignJWT } from "jose";
import { type NextRequest } from "next/server";

import { prisma } from "@repo/db";

function getJwtSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET!);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    return Response.redirect("todolist://auth?error=cancelled");
  }

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const callbackUrl = `${baseUrl}/api/auth/mobile/callback`;

  try {
    // Échange du code contre les tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json() as { access_token?: string };
    if (!tokens.access_token) throw new Error("Pas d'access token");

    // Récupération du profil
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json() as {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    // Upsert user
    const user = await prisma.user.upsert({
      where: { email: profile.email ?? profile.sub },
      update: { name: profile.name, image: profile.picture },
      create: {
        email: profile.email ?? `${profile.sub}@google.com`,
        name: profile.name,
        image: profile.picture,
        emailVerified: new Date(),
      },
    });

    // Création du JWT
    const token = await new SignJWT({ sub: user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(getJwtSecret());

    // Encodage des infos user pour l'app
    const userParam = encodeURIComponent(
      JSON.stringify({ id: user.id, name: user.name, email: user.email, image: user.image }),
    );

    return Response.redirect(`todolist://auth?token=${token}&user=${userParam}`);
  } catch (e) {
    console.error("[mobile auth callback]", e);
    return Response.redirect("todolist://auth?error=server_error");
  }
}
