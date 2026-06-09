import { getActivityUnreadSnapshot } from "@repo/api/server";

import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_MS = 45_000;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
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
