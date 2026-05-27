import { jwtVerify } from "jose";

export interface Context {
  userId: string | null;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET manquant");
  return new TextEncoder().encode(secret);
}

export async function createContext(opts: { req: Request }): Promise<Context> {
  const authHeader = opts.req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const { payload } = await jwtVerify(token, getJwtSecret());
      if (typeof payload.sub === "string") {
        return { userId: payload.sub };
      }
    } catch {
      // token invalide ou expiré
    }
  }

  return { userId: null };
}
