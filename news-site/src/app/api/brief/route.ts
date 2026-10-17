import { filterIndustryArticles } from "@/lib/industry-relevance";
import { getStoryBrief, streamBrief, type BriefEvent } from "@/lib/brief";
import { isLocale, type Locale } from "@/lib/i18n";
import { parseStoryPayload } from "@/lib/story-url";

export const dynamic = "force-dynamic";

function parseBody(raw: string): { story: string; signature: string; locale: Locale } | null {
  if (raw.length > 16000) return null;
  try {
    const body = JSON.parse(raw) as Record<string, unknown>;
    if (!body || typeof body.story !== "string" || typeof body.signature !== "string") return null;
    if (typeof body.locale !== "string" || !isLocale(body.locale)) return null;
    return { story: body.story, signature: body.signature, locale: body.locale };
  } catch {
    return null;
  }
}

/**
 * Generates the "quick brief".
 *
 * `?stream=1` returns newline-delimited JSON events so the reader sees each
 * sentence as it is written, instead of waiting for the whole brief. Without it
 * the assembled brief is returned as JSON.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const body = parseBody(raw);
  if (!body) return new Response("Invalid request", { status: 400 });

  const article = parseStoryPayload(body.story, body.signature);
  if (!article) return new Response("Invalid story", { status: 400 });
  if (!filterIndustryArticles([{ ...article, locale: body.locale }], request.headers.get("x-elevate-industry") || "").length) return new Response("Story is outside your selected industry", { status: 403 });

  const locale = body.locale;
  const wantsStream = new URL(request.url).searchParams.get("stream") === "1";

  if (!wantsStream) {
    return Response.json(await getStoryBrief(article, locale), {
      headers: { "cache-control": "no-store" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: BriefEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        for await (const event of streamBrief(article, locale)) send(event);
      } catch (error) {
        // A reader navigating away mid-stream is normal, not an error.
        if (!request.signal.aborted) {
          console.error("[brief] stream failed:", (error as Error).message);
        }
        try {
          send({ type: "done", brief: { lines: [], generatedByAi: false } });
        } catch {
          /* client already gone */
        }
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      // Stops reverse proxies from buffering the stream.
      "x-accel-buffering": "no",
    },
  });
}
