import { verifyJwtSub } from "./jwt";

export interface Context {
  userId: string | null;
}

export async function createContext(opts: { req: Request }): Promise<Context> {
  const authHeader = opts.req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const userId = await verifyJwtSub(authHeader.slice(7));
    if (userId) return { userId };
  }

  return { userId: null };
}
