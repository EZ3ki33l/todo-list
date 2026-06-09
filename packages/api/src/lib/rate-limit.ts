type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 20_000;

function pruneExpired(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of Array.from(buckets.entries())) {
    if (now >= bucket.resetAt) buckets.delete(key);
    if (buckets.size < MAX_BUCKETS * 0.8) break;
  }
}

/** Fenêtre glissante en mémoire (une instance Node). Retourne true si la requête est autorisée. */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  pruneExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function rateLimitResponse(message = "Trop de requêtes. Réessayez plus tard."): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": "60",
    },
  });
}
