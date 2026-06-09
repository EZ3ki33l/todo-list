import { getClientIp } from "./lib/get-client-ip";
import { verifyJwtSub } from "./jwt";

export interface Context {
  userId: string | null;
  ip: string;
}

export async function createContext(opts: { req: Request }): Promise<Context> {
  const ip = getClientIp(opts.req);
  const authHeader = opts.req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const userId = await verifyJwtSub(authHeader.slice(7));
    if (userId) return { userId, ip };
  }

  return { userId: null, ip };
}
