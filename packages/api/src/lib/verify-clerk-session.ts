import { verifyToken } from "@clerk/backend";

export async function verifyClerkSessionToken(sessionToken: string): Promise<string> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY manquant");
  }

  const payload = await verifyToken(sessionToken, { secretKey });
  if (!payload.sub) {
    throw new Error("Token Clerk invalide");
  }
  return payload.sub;
}
