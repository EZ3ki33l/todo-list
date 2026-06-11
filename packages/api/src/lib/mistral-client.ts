const MISTRAL_CHAT_URL = "https://api.mistral.ai/v1/chat/completions";
const DEFAULT_MODEL = "mistral-small-latest";

export type MistralMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function getMistralConfig(): { apiKey: string; model: string } {
  const apiKey = process.env.MISTRAL_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Suggestions repas indisponibles (MISTRAL_API_KEY non configurée).");
  }
  return { apiKey, model: process.env.MISTRAL_MODEL?.trim() || DEFAULT_MODEL };
}

export async function mistralChat(params: {
  messages: MistralMessage[];
  temperature?: number;
  jsonMode?: boolean;
}): Promise<string> {
  const { apiKey, model } = getMistralConfig();

  const res = await fetch(MISTRAL_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: params.temperature ?? 0.7,
      ...(params.jsonMode ? { response_format: { type: "json_object" } } : {}),
      messages: params.messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new Error("Limite Mistral atteinte. Réessayez dans une minute.");
    }
    console.error("[mistral] HTTP", res.status, body.slice(0, 500));
    throw new Error("Service de suggestions temporairement indisponible.");
  }

  const payload = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Réponse IA vide");
  return content;
}
