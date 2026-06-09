import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter, createContext } from "@repo/api";

import { guardApiRequest } from "@/lib/api-guard";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: ({ req }) => createContext({ req }),
  });

export async function GET(req: Request) {
  const blocked = guardApiRequest(req, { limit: 300 });
  if (blocked) return blocked;
  return handler(req);
}

export async function POST(req: Request) {
  const blocked = guardApiRequest(req, { limit: 300 });
  if (blocked) return blocked;
  return handler(req);
}
