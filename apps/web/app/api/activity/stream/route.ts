import { getActivityUnreadSnapshot, verifyJwtSub } from "@repo/api/server";
import { auth } from "@clerk/nextjs/server";

import { getAppUser } from "@/lib/app-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_MS = 45_000;

async function resolveUserId(req: Request): Promise<string | null> {
  const token = new URL(req.url).searchParams.get("token");
  if (token) {
    const fromJwt = await verifyJwtSub(token);
    if (fromJwt) return fromJwt;
  }

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const user = await getAppUser();
  return user?.id ?? null;
}

export async function GET(req: Request) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let lastPayload = "";
      let interval: ReturnType<typeof setInterval> | null = null;

      const push = async () => {
        try {
          const snap = await getActivityUnreadSnapshot(userId);
          const json = JSON.stringify({
            count: snap.count,
            latest: snap.latest
              ? { ...snap.latest, createdAt: snap.latest.createdAt.toISOString() }
              : null,
          });
          if (json !== lastPayload) {
            lastPayload = json;
            controller.enqueue(encoder.encode(`data: ${json}\n\n`));
          }
        } catch {
          /* ignore transient DB errors */
        }
      };

      void push();
      interval = setInterval(() => void push(), POLL_MS);

      req.signal.addEventListener("abort", () => {
        if (interval) clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
