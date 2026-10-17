/**
 * Any OpenAI-compatible chat provider for the quick brief.
 *
 * One implementation covers the free tiers people actually use:
 *   Groq           BRIEF_API_BASE_URL=https://api.groq.com/openai/v1
 *   Cerebras       https://api.cerebras.ai/v1
 *   GitHub Models  https://models.github.ai/inference
 *   OpenRouter     https://openrouter.ai/api/v1
 *   Ollama (local) http://localhost:11434/v1
 *
 * Configured with BRIEF_API_KEY + BRIEF_MODEL; `BRIEF_API_BASE_URL` defaults to
 * Groq. When a key is present this becomes the primary engine and Gemini is only
 * used if it has a key too.
 */

export type BriefApiConfig = {
  baseUrl: string;
  key: string;
  /** Tried in order: the configured model first, then known-good defaults. */
  models: string[];
};

const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const FALLBACK_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];

export function briefApiConfig(): BriefApiConfig | null {
  const key = process.env.BRIEF_API_KEY?.trim();
  if (!key) return null;

  const baseUrl = (process.env.BRIEF_API_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const configured = process.env.BRIEF_MODEL?.trim();
  const models = [...new Set([configured, ...FALLBACK_MODELS].filter((model): model is string => Boolean(model)))];

  return { baseUrl, key, models };
}

export type ChatMessage = { role: "system" | "user"; content: string };

type DeltaChunk = {
  choices?: Array<{ delta?: { content?: string | null }; finish_reason?: string | null }>;
  error?: { message?: string };
};

/**
 * Streams text deltas from an OpenAI-compatible endpoint. The response format is
 * the de-facto standard SSE: `data: {...}` frames ending with `data: [DONE]`.
 */
export async function* streamChatDeltas(
  config: BriefApiConfig,
  model: string,
  messages: ChatMessage[],
  timeoutMs: number,
  maxTokens = 700,
): AsyncGenerator<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: true,
      // Low temperature: the brief must report the article, not embellish it.
      temperature: 0.3,
      max_tokens: maxTokens,
      messages,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const raw = (await response.text().catch(() => "")).replace(/\s+/g, " ");
    throw new Error(`Brief API ${response.status}: ${raw.slice(0, 160)}`);
  }
  if (!response.body) throw new Error("Brief API returned an empty body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let framing = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      framing += decoder.decode(value, { stream: true });
      const frames = framing.split("\n");
      framing = frames.pop() ?? "";

      for (const frame of frames) {
        if (!frame.startsWith("data:")) continue;
        const payload = frame.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        let chunk: DeltaChunk;
        try {
          chunk = JSON.parse(payload) as DeltaChunk;
        } catch {
          continue;
        }
        const piece = chunk.choices?.[0]?.delta?.content;
        if (piece) yield piece;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** HTTP status from an error thrown by `streamChatDeltas`, when there is one. */
export function briefApiStatus(error: unknown): number {
  const match = /Brief API (\d{3})/.exec((error as Error)?.message ?? "");
  return match ? Number(match[1]) : 0;
}
