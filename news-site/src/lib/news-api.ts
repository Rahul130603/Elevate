/**
 * Optional keyed news providers (NewsData.io, GNews).
 *
 * Why they exist: Google News RSS gives excellent headlines but no images, and
 * resolving a story's publisher URL goes through a Google endpoint that rate
 * limits by IP (HTTP 429). A keyed API returns `image` + the real publisher `url`
 * + a description in the same response, so with one of these enabled:
 *
 *   - every story gets its publisher photo (no decoding, no throttling)
 *   - the AI brief reads the real article instead of falling back to a headline
 *
 * The taxonomy is unchanged: sections that map to an API category use it, and
 * everything else (sub-categories, Politics/Legal) uses the same keyword that the
 * Google provider would have used.
 *
 * Free tiers are small (NewsData 200 credits/day, GNews 100 requests/day) and
 * return at most 10 articles per request, hence NEWS_API_PAGES — raise it on a
 * paid plan. A key is never required: without one the site uses Google News RSS.
 */

import type { Category, FeedSpec } from "./categories";
import { localeMeta, type Locale } from "./i18n";
import type { Article, Provider, ProviderFetchOptions } from "./news-types";
import { decodeEntities, hashString } from "./rss";
import { newsCountry } from "./site";

type ProviderOptions = ProviderFetchOptions;

const REQUEST_TIMEOUT_MS = 12_000;
/** 10 is the free-tier ceiling per request. */
const PAGE_SIZE = 10;
const MAX_PAGES = 9;

/**
 * A key that has been rejected, or has run out of its free quota, must not be
 * retried on every page: each attempt costs a round trip before the Google
 * fallback runs, and prints a warning. In development that warning is one of the
 * "issues" the Next dev overlay counts on every click, so a bad key looked like a
 * broken page. After an auth/quota failure the keyed providers stand down for a
 * cooldown and the site quietly uses Google News RSS.
 */
const KEY_COOLDOWN_MS = 10 * 60 * 1000;
let keyedProvidersPausedUntil = 0;
let pausedReasonLogged = false;

function pauseKeyedProviders(status: number) {
  keyedProvidersPausedUntil = Date.now() + KEY_COOLDOWN_MS;
  if (pausedReasonLogged) return;
  pausedReasonLogged = true;
  console.warn(
    `[news] keyed news API refused the request (HTTP ${status}: bad key or spent quota) — Google News RSS only for the next ${KEY_COOLDOWN_MS / 60_000} minutes`,
  );
}

function keyedProvidersUsable(): boolean {
  return Date.now() >= keyedProvidersPausedUntil;
}

function pagesToFetch(limit: number): number {
  const configured = Number(process.env.NEWS_API_PAGES ?? "1");
  const wanted = Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 1;
  const needed = Math.ceil(limit / PAGE_SIZE);
  return Math.min(Math.max(1, Math.min(wanted, needed)), MAX_PAGES);
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function toIso(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toArticle(input: {
  title: string;
  url: string;
  image?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  publishedAt?: unknown;
  category: Category;
  locale: Locale;
}): Article | null {
  const title = decodeEntities(input.title).replace(/\s+/g, " ").trim();
  const url = input.url?.trim();
  if (!title || !url || !/^https?:\/\//i.test(url)) return null;

  return {
    id: `a${hashString(`${url}|${title}`).toString(36)}`,
    title,
    url,
    source: (input.source || hostnameOf(url) || "News").slice(0, 120),
    sourceUrl: input.sourceUrl ?? undefined,
    publishedAt: toIso(input.publishedAt),
    category: input.category,
    locale: input.locale,
    image: input.image ?? null,
    slug: slugify(title),
  };
}

function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

/** API category per Google topic; anything unmapped becomes a keyword search. */
const TOPIC_TO_CATEGORY: Record<string, string> = {
  WORLD: "world",
  TECHNOLOGY: "technology",
  SCIENCE: "science",
  SPORTS: "sports",
  BUSINESS: "business",
  HEALTH: "health",
};

function keyword(options: ProviderOptions): string | null {
  const explicit = options.q?.trim();
  if (explicit) return explicit;
  return options.feed?.kind === "query" ? options.feed.query : null;
}

function categoryFor(options: ProviderOptions): string | null {
  if (options.category === "top") return null;
  if (options.feed?.kind !== "topic") return null;
  return TOPIC_TO_CATEGORY[options.feed.topic] ?? null;
}

/* ------------------------------------------------------------------ */
/* NewsData.io                                                         */
/* ------------------------------------------------------------------ */

type NewsDataArticle = {
  article_id?: string;
  title?: string;
  link?: string;
  description?: string;
  image_url?: string | null;
  pubDate?: string;
  source_id?: string;
  source_name?: string;
  source_url?: string;
};

async function fetchNewsData(options: ProviderOptions): Promise<Article[]> {
  const apiKey = process.env.NEWSDATA_API_KEY?.trim();
  if (!apiKey) throw new Error("NEWSDATA_API_KEY is not set");

  const language = localeMeta[options.locale].hl;
  const country = newsCountry.toLowerCase();
  const category = categoryFor(options);
  const query = keyword(options);
  const pages = pagesToFetch(options.limit);
  const out: Article[] = [];
  let page: string | null = null;

  for (let index = 0; index < pages; index += 1) {
    const params = new URLSearchParams({ apikey: apiKey, country, language, size: String(PAGE_SIZE) });
    if (category) params.set("category", category);
    if (query) params.set("q", query);
    if (page) params.set("page", page);

    const response = await fetch(`https://newsdata.io/api/1/latest?${params.toString()}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 429) {
        pauseKeyedProviders(response.status);
      }
      throw new Error(`NewsData.io request failed (${response.status})`);
    }

    const body = (await response.json()) as {
      status?: string;
      results?: NewsDataArticle[] | { message?: string };
      nextPage?: string;
    };
    if (body.status === "error" || !Array.isArray(body.results)) {
      const message = Array.isArray(body.results) ? "unknown error" : (body.results?.message ?? "unknown error");
      throw new Error(`NewsData.io error: ${message}`);
    }

    for (const item of body.results) {
      const article = toArticle({
        title: item.title ?? "",
        url: item.link ?? "",
        image: item.image_url ?? null,
        source: item.source_name ?? item.source_id ?? null,
        sourceUrl: item.source_url ?? null,
        publishedAt: item.pubDate,
        category: options.category,
        locale: options.locale,
      });
      if (article) out.push(article);
    }

    page = body.nextPage ?? null;
    if (!page) break;
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* GNews                                                               */
/* ------------------------------------------------------------------ */

type GNewsArticle = {
  title?: string;
  description?: string;
  url?: string;
  image?: string | null;
  publishedAt?: string;
  source?: { name?: string; url?: string };
};

async function fetchGNews(options: ProviderOptions): Promise<Article[]> {
  const apiKey = process.env.GNEWS_API_KEY?.trim();
  if (!apiKey) throw new Error("GNEWS_API_KEY is not set");

  const language = localeMeta[options.locale].hl;
  const country = newsCountry.toLowerCase();
  const category = categoryFor(options);
  const query = keyword(options);
  const pages = pagesToFetch(options.limit);
  const out: Article[] = [];

  for (let index = 0; index < pages; index += 1) {
    const params = new URLSearchParams({
      apikey: apiKey,
      lang: language,
      country,
      max: String(PAGE_SIZE),
      page: String(index + 1),
    });
    if (category) params.set("category", category);

    const endpoint = query ? "search" : "top-headlines";
    if (query) params.set("q", query);

    const response = await fetch(`https://gnews.io/api/v4/${endpoint}?${params.toString()}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 429) {
        pauseKeyedProviders(response.status);
      }
      throw new Error(`GNews request failed (${response.status})`);
    }

    const body = (await response.json()) as { articles?: GNewsArticle[]; errors?: unknown };
    if (!Array.isArray(body.articles)) {
      throw new Error(`GNews error: ${JSON.stringify(body.errors ?? body).slice(0, 120)}`);
    }

    for (const item of body.articles) {
      const article = toArticle({
        title: item.title ?? "",
        url: item.url ?? "",
        image: item.image ?? null,
        source: item.source?.name ?? null,
        sourceUrl: item.source?.url ?? null,
        publishedAt: item.publishedAt,
        category: options.category,
        locale: options.locale,
      });
      if (article) out.push(article);
    }

    if (body.articles.length < PAGE_SIZE) break;
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Registration                                                        */
/* ------------------------------------------------------------------ */

export const newsDataProvider: Provider = {
  id: "newsdata",
  label: "NewsData.io",
  attribution: "NewsData.io",
  enabled: () => Boolean(process.env.NEWSDATA_API_KEY?.trim()) && keyedProvidersUsable(),
  fetch: fetchNewsData,
};

export const gnewsProvider: Provider = {
  id: "gnews",
  label: "GNews",
  attribution: "GNews",
  enabled: () => Boolean(process.env.GNEWS_API_KEY?.trim()) && keyedProvidersUsable(),
  fetch: fetchGNews,
};
