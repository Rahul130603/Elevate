import { createHmac, timingSafeEqual } from "node:crypto";

import { isCategory } from "./categories";
import type { Locale } from "./i18n";
import type { Article } from "./news";

type StoryPayload = Pick<
  Article,
  "id" | "title" | "url" | "source" | "sourceUrl" | "publishedAt" | "category" | "image" | "slug"
  | "originalTitle"
>;

const DEV_FALLBACK_SECRET = "meeetly-local-development-secret";
let warnedAboutFallback = false;

/**
 * Story links are signed so the page never trusts query data. When the secret is
 * missing we fall back to a fixed development string — but that silently makes
 * every link signed *before* the variable was set unverifiable, which shows up as
 * a 404 on the story page. Hence the warning (and the id-based recovery there).
 */
function signingSecret(): string {
  const secret = process.env.STORY_LINK_SECRET?.trim();
  if (secret) return secret;

  if (!warnedAboutFallback) {
    warnedAboutFallback = true;
    console.warn(
      "[story-url] STORY_LINK_SECRET is not set; signing story links with the development fallback. " +
        "Links rendered earlier with the real secret will fall back to an id lookup.",
    );
  }
  return DEV_FALLBACK_SECRET;
}

function sign(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Signed internal URL used by every headline, card and ticker item. */
export function storyHref(locale: Locale, article: Article): string {
  const payload: StoryPayload = {
    id: article.id,
    title: article.title,
    originalTitle: article.originalTitle,
    url: article.url,
    source: article.source,
    sourceUrl: article.sourceUrl,
    publishedAt: article.publishedAt,
    category: article.category,
    image: article.image,
    slug: article.slug,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const params = new URLSearchParams({ story: encoded, sig: sign(encoded) });
  return `/${locale}/story/${encodeURIComponent(article.id)}/${encodeURIComponent(article.slug || "news")}?${params}`;
}

/** Verifies and decodes a story link without trusting user-controlled query data. */
export function parseStoryPayload(encoded?: string, signature?: string): Article | null {
  if (!encoded || !signature || encoded.length > 12_000 || !safeEqual(sign(encoded), signature)) return null;

  try {
    const value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<StoryPayload>;
    const url = new URL(value.url ?? "");
    if (
      !value.id ||
      !value.title ||
      !value.source ||
      !value.slug ||
      !isCategory(value.category) ||
      !["http:", "https:"].includes(url.protocol)
    ) {
      return null;
    }

    return {
      id: String(value.id).slice(0, 100),
      title: String(value.title).slice(0, 300),
      originalTitle: value.originalTitle ? String(value.originalTitle).slice(0, 300) : undefined,
      url: url.toString(),
      source: String(value.source).slice(0, 120),
      sourceUrl: value.sourceUrl ? String(value.sourceUrl).slice(0, 500) : undefined,
      publishedAt: value.publishedAt ? String(value.publishedAt).slice(0, 40) : null,
      category: value.category,
      image: value.image ? String(value.image).slice(0, 2_000) : null,
      slug: String(value.slug).slice(0, 100),
      locale: "en",
    };
  } catch {
    return null;
  }
}
