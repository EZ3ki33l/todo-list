import { checkRateLimit, getClientIp, rateLimitResponse } from "@repo/api";

const MAX_BODY_BYTES = 1024 * 1024;

export function guardApiRequest(req: Request, opts?: { limit?: number; windowMs?: number }): Response | null {
  const ip = getClientIp(req);
  const limit = opts?.limit ?? 240;
  const windowMs = opts?.windowMs ?? 60_000;

  if (!checkRateLimit(`http:api:${ip}`, limit, windowMs)) {
    return rateLimitResponse();
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const size = Number.parseInt(contentLength, 10);
    if (Number.isFinite(size) && size > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: "Payload trop volumineux" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return null;
}
