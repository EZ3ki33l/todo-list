import type { useAuth as useClerkAuth } from "@clerk/expo";

import type { StoredUser } from "./auth";

type GetClerkToken = ReturnType<typeof useClerkAuth>["getToken"];

type ExchangeResult = { token: string; user: StoredUser };

let exchangeInFlight: Promise<ExchangeResult> | null = null;

function getApiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error("EXPO_PUBLIC_API_URL manquant dans apps/native/.env");
  }
  return url.replace(/\/$/, "");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseTrpcError(body: unknown): string {
  const error = (body as { error?: { message?: string; data?: { code?: string } } })?.error;
  const code = error?.data?.code;
  if (code === "UNAUTHORIZED") {
    return "Session Clerk refusée par l'API — vérifiez CLERK_SECRET_KEY côté web.";
  }
  if (code === "TOO_MANY_REQUESTS") {
    return "Trop de tentatives. Réessayez dans une minute.";
  }
  return error?.message ?? "Échange de session impossible";
}

function parseTrpcSuccess(body: unknown): ExchangeResult {
  const data =
    (body as { result?: { data?: ExchangeResult } })?.result?.data ??
    (body as { result?: { data?: { json?: ExchangeResult } } })?.result?.data?.json;

  if (!data?.token || !data?.user) {
    throw new Error("Réponse API invalide après connexion");
  }
  return data;
}

async function fetchExchange(sessionToken: string): Promise<ExchangeResult> {
  const apiUrl = getApiUrl();
  const endpoint = `${apiUrl}/api/trpc/auth.signInWithClerkToken`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken }),
      signal: controller.signal,
    });

    const body: unknown = await res.json();
    if (!res.ok || (body as { error?: unknown })?.error) {
      const message = parseTrpcError(body);
      const err = new Error(message) as Error & { data?: { code?: string } };
      err.data = { code: (body as { error?: { data?: { code?: string } } })?.error?.data?.code };
      throw err;
    }

    return parseTrpcSuccess(body);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        `API inaccessible (${apiUrl}) — téléphone et PC sur le même Wi‑Fi ? Lancez pnpm --filter web dev.`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/** Échange le JWT Clerk contre le token API — fetch direct + mutex global. */
export async function exchangeClerkSessionForApiToken(
  getToken: GetClerkToken,
): Promise<ExchangeResult> {
  if (exchangeInFlight) {
    return exchangeInFlight;
  }

  exchangeInFlight = (async () => {
    let sessionToken: string | null = null;

    for (let attempt = 0; attempt < 12; attempt++) {
      sessionToken = await getToken({ skipCache: true });
      if (sessionToken) break;
      await sleep(200);
    }

    if (!sessionToken) {
      throw new Error("Token Clerk introuvable après connexion");
    }

    return fetchExchange(sessionToken);
  })().finally(() => {
    exchangeInFlight = null;
  });

  return exchangeInFlight;
}
