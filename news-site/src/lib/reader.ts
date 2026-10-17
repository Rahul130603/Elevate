import { decodeEntities, stripTags } from "./rss";
import { resolvePublisherUrl } from "./images";

export type ReaderPreview = {
  publisherUrl: string;
  excerpt: string | null;
  /** Where the text came from — useful when tuning extraction. */
  via: "json-ld" | "description" | "paragraphs" | "page-text" | "none";
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const MAX_EXCERPT_CHARS = 4_000;
/** A short publisher blurb still grounds a two-sentence brief. */
const MIN_DESCRIPTION_CHARS = 100;
/** Harvested paragraphs have to be substantial before we trust them. */
const MIN_PARAGRAPH_CHARS = 400;
/** A raw page dump is noisy, so it needs plenty of text to be worth using. */
const MIN_DUMP_CHARS = 550;

/** Boilerplate that is never part of the reporting. */
const NOISE =
  /cookie|subscribe|newsletter|advertis|sign in|log in|follow us|download (?:the )?app|read more|also read|related (?:stories|articles)|trending|share (?:this|on)|^watch:|^photo:|^image:|courtesy|getty|all rights reserved|terms of (?:use|service)|privacy policy|enable javascript|your browser|we use cookies|comments are|(?:^|\s)updated:|published on/i;

function cleanText(value: string): string {
  return decodeEntities(stripTags(value))
    .replace(/\\n/g, " ")
    .replace(/\\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clamp(value: string, minChars: number): string | null {
  const clean = cleanText(value);
  if (clean.length < minChars) return null;
  if (clean.length <= MAX_EXCERPT_CHARS) return clean;

  const shortened = clean.slice(0, MAX_EXCERPT_CHARS);
  const boundary = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, boundary > MAX_EXCERPT_CHARS - 400 ? boundary : MAX_EXCERPT_CHARS).trim()}…`;
}

function findArticleData(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findArticleData(item);
      if (match) return match;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  const types = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]];
  if (types.some((type) => typeof type === "string" && /(?:News)?Article$/i.test(type))) {
    return record;
  }

  for (const child of Object.values(record)) {
    const match = findArticleData(child);
    if (match) return match;
  }
  return null;
}

type JsonLdText = { body: string | null; description: string | null };

function jsonLdText(html: string): JsonLdText {
  const scripts = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  let description: string | null = null;

  for (const match of scripts) {
    try {
      const parsed = JSON.parse(decodeEntities(match[1]).trim()) as unknown;
      const article = findArticleData(parsed);
      if (!article) continue;

      const body = typeof article.articleBody === "string" ? clamp(article.articleBody, 300) : null;
      if (body) return { body, description: null };

      if (!description && typeof article.description === "string") {
        description = clamp(article.description, MIN_DESCRIPTION_CHARS);
      }
    } catch {
      // Publishers frequently include malformed JSON-LD; fall through to meta tags.
    }
  }

  return { body: null, description };
}

function metaText(html: string): string | null {
  const patterns = [
    /<meta[^>]+(?:name|property)=["'](?:description|og:description|twitter:description)["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description|twitter:description)["']/i,
  ];
  for (const pattern of patterns) {
    const result = clamp(html.match(pattern)?.[1] ?? "", MIN_DESCRIPTION_CHARS);
    if (result) return result;
  }
  return null;
}

/**
 * Last resort for publishers without usable metadata: harvest the body
 * paragraphs. Only accepted when enough clean prose survives the noise filter.
 */
function paragraphText(html: string): string | null {
  const blocks = [...html.matchAll(/<p\b[^>]*>([\s\S]{60,2000}?)<\/p>/gi)]
    .map((match) => cleanText(match[1]))
    .filter((text) => text.length > 80 && !NOISE.test(text));

  if (blocks.length === 0) return null;

  const joined = blocks.slice(0, 16).join(" ");
  if (joined.length < MIN_PARAGRAPH_CHARS) return null;
  return clamp(joined, MIN_PARAGRAPH_CHARS);
}

/**
 * Many Indian publishers render the story inside plain `<div>`s (or hydrate it
 * client-side), so `<p>` harvesting finds nothing. This flattens the page to
 * block-level text runs and keeps the long, non-boilerplate ones.
 */
function pageText(html: string): string | null {
  const withoutChrome = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<(?:nav|header|footer|aside|form|figure)[\s\S]*?<\/(?:nav|header|footer|aside|form|figure)>/gi, " ");

  const runs = withoutChrome
    .split(/<\/(?:p|div|section|article|li|h[1-6]|td|br)>/i)
    .map((run) => cleanText(run))
    .filter((run) => run.length >= 110 && !NOISE.test(run));

  if (runs.length === 0) return null;

  const joined = runs.slice(0, 22).join(" ");
  if (joined.length < MIN_DUMP_CHARS) return null;
  return clamp(joined, MIN_DUMP_CHARS);
}

/**
 * Builds a short on-site reader preview from publisher metadata. We deliberately
 * cap it to an excerpt; the publisher remains the canonical home of the article.
 *
 * Extraction cascades from cleanest to noisiest, because the quality of the
 * brief depends entirely on how much real reporting we can hand the model.
 */
export async function getReaderPreview(articleUrl: string): Promise<ReaderPreview> {
  const publisherUrl = (await resolvePublisherUrl(articleUrl)) ?? articleUrl;

  try {
    const response = await fetch(publisherUrl, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      next: { revalidate: 6 * 60 * 60 },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return { publisherUrl, excerpt: null, via: "none" };

    const resolvedUrl = response.url || publisherUrl;
    const html = (await response.text()).slice(0, 600_000);

    const jsonLd = jsonLdText(html);
    if (jsonLd.body) return { publisherUrl: resolvedUrl, excerpt: jsonLd.body, via: "json-ld" };

    // A Google News shell page has no reporting in it — never brief from that.
    const isGoogleShell = /(^|\.)news\.google\.com$/.test(new URL(resolvedUrl).hostname);
    const paragraphs = paragraphText(html);
    const dump = isGoogleShell ? null : pageText(html);
    const description = jsonLd.description ?? metaText(html);

    const candidates: Array<{ via: ReaderPreview["via"]; text: string } | null> = [
      // Clean, structured sources first: a noisy page dump makes the model
      // answer UNAVAILABLE, which is worse than a short honest blurb.
      paragraphs ? { via: "paragraphs", text: paragraphs } : null,
      description ? { via: "description", text: description } : null,
      dump ? { via: "page-text", text: dump } : null,
    ];

    const chosen = candidates.find((candidate) => candidate !== null);
    return chosen
      ? { publisherUrl: resolvedUrl, excerpt: chosen.text, via: chosen.via }
      : { publisherUrl: resolvedUrl, excerpt: null, via: "none" };
  } catch {
    return { publisherUrl, excerpt: null, via: "none" };
  }
}
