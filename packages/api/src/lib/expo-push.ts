type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
};

type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    console.error("[push] Expo API HTTP", res.status, await res.text());
    return;
  }

  const tickets = (await res.json()) as { data?: ExpoPushTicket[] };
  for (const ticket of tickets.data ?? []) {
    if (ticket.status === "error") {
      console.error("[push] ticket error:", ticket.message, ticket.details);
    }
  }
}
