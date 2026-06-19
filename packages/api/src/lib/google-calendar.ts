import "server-only";

import { isDateOnlyDueAt, toLocalDateInput, GOOGLE_CALENDAR_EVENTS_SCOPE } from "./action-form";
import { getClerkClient, userHasGoogleAccount } from "./clerk-user";

type CreateEventParams = {
  clerkUserId: string;
  title: string;
  dueAt: Date;
  notes?: string | null;
  location?: string | null;
};

export type GoogleCalendarResult =
  | { ok: true; eventId: string }
  | { ok: false; error: string };

export type GoogleCalendarAccessStatus = {
  linked: boolean;
  hasToken: boolean;
  hasCalendarScope: boolean;
  tokenScopes: string[];
};

const GOOGLE_OAUTH_PROVIDERS = ["google", "oauth_google"] as const;

function pad2(value: number): string {
  return `${value}`.padStart(2, "0");
}

function formatLocalDateTime(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function addDaysToLocalDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return toLocalDateInput(new Date(year, month - 1, day + days));
}

function tokenHasCalendarScope(scopes: string[]): boolean {
  return scopes.some(
    (scope) =>
      scope === GOOGLE_CALENDAR_EVENTS_SCOPE ||
      scope === "https://www.googleapis.com/auth/calendar" ||
      scope.endsWith("/auth/calendar.events") ||
      scope.endsWith("/auth/calendar"),
  );
}

async function getGoogleAccessToken(clerkUserId: string): Promise<string | null> {
  const client = getClerkClient();
  for (const provider of GOOGLE_OAUTH_PROVIDERS) {
    try {
      const tokens = await client.users.getUserOauthAccessToken(
        clerkUserId,
        provider as "google",
      );
      const token = tokens.data[0]?.token;
      if (token) return token;
    } catch (err) {
      console.warn(`[google-calendar] token provider=${provider}`, err);
    }
  }
  return null;
}

async function getTokenScopes(accessToken: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { scope?: string };
    return data.scope?.split(" ").filter(Boolean) ?? [];
  } catch {
    return [];
  }
}

type GoogleApiErrorBody = {
  error?: {
    message?: string;
    errors?: Array<{ reason?: string }>;
    details?: Array<{ reason?: string; metadata?: Record<string, string> }>;
  };
};

function parseGoogleApiErrorBody(body: string): GoogleApiErrorBody["error"] | null {
  try {
    const parsed = JSON.parse(body) as GoogleApiErrorBody;
    return parsed.error ?? null;
  } catch {
    return null;
  }
}

function mapGoogleApiError(status: number, body: string): string {
  const error = parseGoogleApiErrorBody(body);
  const message = error?.message ?? "";
  const reason =
    error?.details?.find((detail) => detail.reason)?.reason ??
    error?.errors?.[0]?.reason ??
    "";

  if (reason === "SERVICE_DISABLED" || message.includes("has not been used in project")) {
    const activationUrl =
      error?.details?.find((detail) => detail.metadata?.activationUrl)?.metadata
        ?.activationUrl ??
      "https://console.cloud.google.com/apis/library/calendar-json.googleapis.com";
    return `L'API Google Calendar n'est pas activée dans votre projet Google Cloud (credentials personnalisées Clerk). Activez-la ici : ${activationUrl} puis attendez 1–2 minutes.`;
  }

  if (
    reason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT" ||
    message.includes("insufficient authentication scopes")
  ) {
    return `Le jeton Google n'inclut pas l'accès Agenda. Dans Clerk, vérifiez le scope ${GOOGLE_CALENDAR_EVENTS_SCOPE}, puis déconnectez et reconnectez Google depuis votre profil.`;
  }

  if (status === 401) {
    return "Jeton Google expiré. Reconnectez votre compte Google.";
  }

  if (message) {
    return message;
  }

  return `Google Agenda a refusé l'événement (erreur ${status}).`;
}

function noTokenError(): string {
  return `Impossible d'obtenir un jeton Google. Vérifiez la connexion Google dans Clerk (scope ${GOOGLE_CALENDAR_EVENTS_SCOPE}).`;
}

function missingScopeError(): string {
  return `Le jeton Google actuel n'a pas l'accès Agenda. Reconnectez Google après avoir ajouté le scope ${GOOGLE_CALENDAR_EVENTS_SCOPE} dans Clerk.`;
}

export async function checkGoogleCalendarAccess(
  clerkUserId: string,
): Promise<GoogleCalendarAccessStatus> {
  const linked = await userHasGoogleAccount(clerkUserId);
  if (!linked) {
    return { linked: false, hasToken: false, hasCalendarScope: false, tokenScopes: [] };
  }

  const token = await getGoogleAccessToken(clerkUserId);
  if (!token) {
    return { linked: true, hasToken: false, hasCalendarScope: false, tokenScopes: [] };
  }

  const tokenScopes = await getTokenScopes(token);
  return {
    linked: true,
    hasToken: true,
    hasCalendarScope: tokenHasCalendarScope(tokenScopes),
    tokenScopes,
  };
}

export async function userCanUseGoogleCalendar(clerkUserId: string | null | undefined): Promise<boolean> {
  if (!clerkUserId) return false;
  const status = await checkGoogleCalendarAccess(clerkUserId);
  return status.linked && status.hasToken && status.hasCalendarScope;
}

export async function createGoogleCalendarEvent(
  params: CreateEventParams,
): Promise<GoogleCalendarResult> {
  const accessToken = await getGoogleAccessToken(params.clerkUserId);
  if (!accessToken) {
    return { ok: false, error: noTokenError() };
  }

  const tokenScopes = await getTokenScopes(accessToken);
  if (!tokenHasCalendarScope(tokenScopes)) {
    return { ok: false, error: missingScopeError() };
  }

  const timeZone = "Europe/Paris";
  const dateOnly = isDateOnlyDueAt(params.dueAt);
  const localDate = toLocalDateInput(params.dueAt);

  const eventBody = dateOnly
    ? {
        summary: params.title,
        description: params.notes ?? undefined,
        location: params.location ?? undefined,
        start: { date: localDate },
        end: { date: addDaysToLocalDate(localDate, 1) },
      }
    : {
        summary: params.title,
        description: params.notes ?? undefined,
        location: params.location ?? undefined,
        start: { dateTime: formatLocalDateTime(params.dueAt), timeZone },
        end: {
          dateTime: formatLocalDateTime(new Date(params.dueAt.getTime() + 60 * 60_000)),
          timeZone,
        },
      };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error("[google-calendar] create event", res.status, body);
    return { ok: false, error: mapGoogleApiError(res.status, body) };
  }

  const data = (await res.json()) as { id?: string };
  if (!data.id) {
    return { ok: false, error: "Google Agenda n'a pas renvoyé d'identifiant d'événement." };
  }

  return { ok: true, eventId: data.id };
}
