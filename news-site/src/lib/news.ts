import { liveIndustryQuery, recentQuery } from "./live-news";
import { localizeArticles } from "./news-translation";
import { headers } from "next/headers";
import { filterIndustryArticles } from "./industry-relevance";
import { DEFAULT_CATEGORY, getSection, getSubCategory, type Category, type FeedSpec } from "./categories";
import { attachImages } from "./images";
import { localeMeta, type Locale } from "./i18n";
import { gnewsProvider, newsDataProvider } from "./news-api";
import type { Article, NewsQuery, NewsResult, Provider } from "./news-types";
import { decodeEntities, hashString, parseFeed, type RawFeedItem } from "./rss";
import { feedRevalidateSeconds, newsCountry } from "./site";

// Re-exported so every existing `import type { Article } from "@/lib/news"` keeps
// working; the definitions themselves live in news-types.ts to avoid a cycle.
export type { Article, NewsQuery, NewsResult, Provider } from "./news-types";

/* ------------------------------------------------------------------ */
/* Feed URL + provider layer                                           */
/* ------------------------------------------------------------------ */

const FEED_BASE = "https://news.google.com/rss";

/**
 * Resolves the feed behind a section or sub-category. `null` means the edition
 * front page. Sub-categories are always keyword feeds; sections prefer Google's
 * curated topic feeds.
 */
export function feedFor(category: Category, sub?: string): FeedSpec | null {
  if (category === "top") return null;
  if (sub) return getSubCategory(category, sub)?.feed ?? null;
  return getSection(category).feed;
}

export function buildFeedUrl(options: {
  locale: Locale;
  category: Category;
  sub?: string;
  q?: string;
}): string {
  const { locale, category } = options;
  const meta = localeMeta[locale];
  const params = new URLSearchParams({
    hl: meta.hl,
    gl: newsCountry,
    ceid: `${newsCountry}:${meta.hl}`,
  });

  const freeText = options.q?.trim();
  if (freeText) {
    params.set("q", freeText);
    return `${FEED_BASE}/search?${params.toString()}`;
  }

  const spec = feedFor(category, options.sub);
  if (spec?.kind === "query") {
    params.set("q", spec.query);
    return `${FEED_BASE}/search?${params.toString()}`;
  }
  if (spec?.kind === "topic") {
    return `${FEED_BASE}/headlines/section/topic/${spec.topic}?${params.toString()}`;
  }

  return `${FEED_BASE}?${params.toString()}`;
}

/**
 * Provider registry. The site ships with the free, key-less Google News RSS
 * provider. Keyed providers (NewsData.io, GNews) are registered in
 * `lib/news-api.ts` and switch on automatically as soon as their key is present,
 * because they also supply the publisher image and URL.
 */
const providers: Provider[] = [
  newsDataProvider,
  gnewsProvider,
  {
    id: "google-news-rss",
    label: "Google News RSS",
    attribution: "Google News",
    enabled: () => true,
    fetch: async ({ locale, category, sub, q, limit }) => {
      const feedUrl = buildFeedUrl({ locale, category, sub, q });
      const response = await fetch(feedUrl, {
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; ElevateNewsBot/1.0; +https://example.com/bot)",
          accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        },
        // The bounded in-process cache handles reuse. Do not add a second,
        // persistent stale-while-revalidate layer behind the Refresh button.
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });

      if (!response.ok) {
        throw new Error(`Feed request failed (${response.status}) for ${feedUrl}`);
      }

      const xml = await response.text();
      return sortArticles(parseFeed(xml).map((item) => toArticle(item, locale, category))).slice(0, limit);
    },
  },
];

/** Google is the fallback: no key needed and it covers every edition. */
function fallbackProvider(): Provider {
  return providers[providers.length - 1];
}

/**
 * `NEWS_PROVIDER` wins when set. Otherwise the first provider with a configured
 * key is used, and Google News RSS when no key is present.
 */
export function activeProvider(): Provider {
  const requested = process.env.NEWS_PROVIDER?.trim();
  if (requested) {
    const match = providers.find((provider) => provider.id === requested);
    if (match) return match;
  }
  return providers.find((provider) => provider.enabled()) ?? fallbackProvider();
}

export const providerAttribution = activeProvider().attribution;

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

function stripSourceSuffix(title: string, source?: string): string {
  const clean = decodeEntities(title).replace(/\s+/g, " ").trim();
  if (!source) return clean;
  const suffix = ` - ${source}`;
  return clean.toLowerCase().endsWith(suffix.toLowerCase())
    ? clean.slice(0, -suffix.length).trim()
    : clean;
}

function toIsoDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toArticle(item: RawFeedItem, locale: Locale, category: Category): Article {
  const title = stripSourceSuffix(item.title, item.source);
  const url = item.link;
  const source = item.source || guessSource(item.description) || hostnameOf(url) || "News";
  const publishedAt = toIsoDate(item.pubDate);
  const id = `a${hashString(`${url}|${title}`).toString(36)}`;

  return {
    id,
    title,
    url,
    source,
    sourceUrl: item.sourceUrl,
    publishedAt,
    category,
    locale,
    image: item.image ?? null,
    slug: slugify(title),
  };
}

function guessSource(description?: string): string | undefined {
  if (!description) return undefined;
  const font = description.match(/<font[^>]*>([\s\S]*?)<\/font>/i)?.[1];
  if (font) return decodeEntities(stripTagsLite(font)).trim() || undefined;
  return undefined;
}

function stripTagsLite(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Removes near-duplicate headlines that aggregators love to repeat. */
export function dedupeArticles(articles: Article[]): Article[] {
  const seenTitles = new Set<string>();
  const seenUrls = new Set<string>();
  const unique: Article[] = [];

  for (const article of articles) {
    const titleKeyValue = titleKey(article.title);
    if (!titleKeyValue || seenTitles.has(titleKeyValue) || seenUrls.has(article.url)) continue;
    seenTitles.add(titleKeyValue);
    seenUrls.add(article.url);
    unique.push(article);
  }

  return unique;
}

/** Comparison key for headlines: case/punctuation/whitespace insensitive. */
export function titleKey(title: string): string {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * Drops anything already displayed elsewhere on the page. Two feeds rarely give
 * the same story the same URL (and often a different publisher), so matching on
 * the normalised headline matters as much as the id — otherwise section strips,
 * the main grid and the sidebar repeat the same story three times.
 */
export function excludeArticles(articles: Article[], shown: Article[]): Article[] {
  const shownIds = new Set(shown.map((article) => article.id));
  const shownTitles = new Set(shown.map((article) => titleKey(article.title)));

  return articles.filter(
    (article) => !shownIds.has(article.id) && !shownTitles.has(titleKey(article.title)),
  );
}

export function sortArticles(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => {
    const left = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const right = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return right - left;
  });
}

/* ------------------------------------------------------------------ */
/* Caching + public API                                                */
/* ------------------------------------------------------------------ */

/**
 * An exhausted free tier is a normal, handled condition — logging it as an error
 * on every render (and mirroring it into the dev overlay) buries the real
 * failures. Each distinct message is reported once a minute, as a warning.
 */
const lastLoggedAt = new Map<string, number>();

function logOnce(key: string, message: string) {
  const now = Date.now();
  if ((lastLoggedAt.get(key) ?? 0) + 60_000 > now) return;
  lastLoggedAt.set(key, now);
  console.warn(`[news] ${message}`);
  if (lastLoggedAt.size > 200) lastLoggedAt.clear();
}

type CacheEntry = { at: number; articles: Article[]; invalidated?: boolean };

const CACHE_TTL_MS = Math.min(feedRevalidateSeconds, 60) * 1000;
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Article[]>>();

function cacheKey(providerId: string, query: Required<Pick<NewsQuery, "locale">> & NewsQuery): string {
  return [
    providerId,
    query.locale,
    query.category ?? DEFAULT_CATEGORY,
    query.sub ?? "",
    query.q?.trim().toLowerCase() ?? "",
  ].join("|");
}

/** Invalidate only the authenticated industry's feed entries. */
export function clearIndustryNewsCache(industry: string, locale: Locale) {
  for (const key of cache.keys()) {
    const parts = key.split("|");
    if ((parts[1] === locale || parts[1] === "en") && parts[2] === "industry" && parts[3] === industry) { const entry = cache.get(key); if (entry) entry.invalidated = true; }
  }
}

/**
 * Never throws: on upstream failure it falls back to the most recent cached
 * payload and reports `ok: false` so pages can show a notice instead of an error.
 */
async function getNewsUnscoped(query: NewsQuery): Promise<NewsResult> {
  const locale = query.locale;
  const category = query.category ?? DEFAULT_CATEGORY;
  const sub = query.sub;
  const limit = Math.min(Math.max(query.limit ?? 30, 1), 120);
  const searchTerm = query.q?.trim().slice(0, 120);
  const withImages = query.withImages !== false;

  const provider = activeProvider();
  const feed = feedFor(category, sub);
  const key = cacheKey(provider.id, { locale, category, sub, q: searchTerm });
  const feedUrl = buildFeedUrl({ locale, category, sub, q: searchTerm });
  const cached = cache.get(key);
  const isFresh = cached && !cached.invalidated && Date.now() - cached.at < CACHE_TTL_MS;

  // Image lookups run against the article-level cache, so a warm page costs
  // nothing here while newly seen stories get their publisher photo attached.
  const withPictures = (articles: Article[]) =>
    withImages ? attachImages(articles) : Promise.resolve(articles);

  if (cached && isFresh) {
    return {
      articles: (await withPictures(cached.articles)).slice(0, limit),
      ok: true,
      stale: false,
      fetchedAt: new Date(cached.at).toISOString(),
      provider: provider.id,
      feedUrl,
    };
  }

  try {
    let pending = inflight.get(key);
    if (!pending) {
      pending = provider
        .fetch({ locale, category, sub, q: searchTerm, limit: 90, feed })
        .then((articles) => sortArticles(dedupeArticles(articles)))
        .finally(() => inflight.delete(key));
      inflight.set(key, pending);
    }

    const articles = await pending;
    cache.set(key, { at: Date.now(), articles });

    return {
      articles: (await withPictures(articles)).slice(0, limit),
      ok: true,
      stale: false,
      fetchedAt: new Date().toISOString(),
      provider: provider.id,
      feedUrl,
    };
  } catch (error) {
    logOnce(`fail:${provider.id}:${feedUrl}`, `${provider.id} failed for ${feedUrl}: ${(error as Error).message}`);

    // A keyed provider on a spent free tier (or a bad key) must not blank the
    // site: fall back to Google News RSS, which needs no key.
    const fallback = fallbackProvider();
    if (provider.id !== fallback.id) {
      try {
        const articles = sortArticles(
          dedupeArticles(await fallback.fetch({ locale, category, sub, q: searchTerm, limit: 90, feed })),
        );
        if (articles.length > 0) {
          logOnce(`fallback:${feedUrl}`, `fell back to ${fallback.id} for ${feedUrl}`);
          cache.set(key, { at: Date.now(), articles });
          return {
            articles: (await withPictures(articles)).slice(0, limit),
            ok: true,
            stale: false,
            fetchedAt: new Date().toISOString(),
            provider: fallback.id,
            feedUrl,
          };
        }
      } catch (fallbackError) {
        logOnce(
          `fallback-fail:${feedUrl}`,
          `${fallback.id} fallback failed for ${feedUrl}: ${(fallbackError as Error).message}`,
        );
      }
    }

    return {
      articles: (await withPictures(cached?.articles ?? [])).slice(0, limit),
      ok: false,
      stale: !!cached,
      fetchedAt: new Date(cached?.at ?? Date.now()).toISOString(),
      provider: provider.id,
      feedUrl,
    };
  }
}

export async function getNews(query: NewsQuery): Promise<NewsResult> {
  const requestHeaders = await headers();
  const industryId = requestHeaders.get("x-elevate-industry");
  const industry = getSubCategory("industry", industryId || "");
  if (!industry) throw new Error("An admin industry session is required.");
  const feeds = [industry, ...(industry.subs || [])];
  const requested = query.q?.trim();
  const matchingFeed = feeds.find(item => item.feed.kind === "query" &&
    (item.feed.query === requested || item.feed.query.split(/\s+/).slice(0, 2).join(" ") === requested));
  const industryQuery = industry.feed.kind === "query" ? industry.feed.query : industry.label;
  const searching = requestHeaders.get('x-elevate-search') === '1';
  const nativeMode = requestHeaders.get('x-elevate-news-mode') === 'native' && query.locale !== 'en';
  const homeQuery = liveIndustryQuery(industry.id, industryQuery);
  const specificFeed = matchingFeed && matchingFeed.id !== industry.id;
  const selectedQuery = searching && requested ? `${homeQuery} ${requested.slice(0, 60)}` : specificFeed ? requested! : homeQuery;
  // Industry taxonomy is English. Verify source headlines before translating,
  // so regional feeds and English-only filters cannot blank other languages.
  const scopedQuery = { ...query, locale: "en" as const, category: "industry" as const, sub: industry.id };
  if (nativeMode) {
    // Search the selected-language edition using translated taxonomy, then
    // translate headlines internally to validate relevance without changing display.
    const seed: Article = { id: 'query', title: specificFeed ? matchingFeed.label : industry.label, url: '', source: '', publishedAt: null, category: 'industry', locale: 'en', image: null, slug: '' };
    const [localized] = await localizeArticles([seed], query.locale);
    const nativeQuery = `${localized.title}${searching && requested ? ` ${requested.slice(0, 60)}` : ''}`;
    const scripts: Record<string, RegExp> = { ta: /[\u0B80-\u0BFF]/, hi: /[\u0900-\u097F]/, mr: /[\u0900-\u097F]/, bn: /[\u0980-\u09FF]/, ml: /[\u0D00-\u0D7F]/, gu: /[\u0A80-\u0AFF]/ };
    const loadNative = async (days: number) => {
      const result = await getNewsUnscoped({ ...scopedQuery, locale: query.locale, q: recentQuery(nativeQuery, days) });
      const native = result.articles.filter(article => scripts[query.locale]?.test(article.title));
      const english = await localizeArticles(native, 'en', true);
      const verified = filterIndustryArticles(english.map(article => ({ ...article, originalTitle: article.title })), industry.id);
      const ids = new Set(verified.map(article => article.id));
      return { ...result, articles: native.filter(article => ids.has(article.id)).map(article => ({ ...article, originalTitle: english.find(item => item.id === article.id)?.title })) };
    };
    const recentNative = await loadNative(7);
    return recentNative.articles.length || !recentNative.ok ? recentNative : loadNative(30);
  }
  const recent = await getNewsUnscoped({ ...scopedQuery, q: recentQuery(selectedQuery) });
  const articles = filterIndustryArticles(recent.articles, industry.id);
  if (articles.length || !recent.ok) return { ...recent, articles: await localizeArticles(articles, query.locale) };
  // Sparse industries can have no reporting this week; never invent fresh items.
  const older = await getNewsUnscoped({ ...scopedQuery, q: recentQuery(selectedQuery, 30) });
  return { ...older, articles: await localizeArticles(filterIndustryArticles(older.articles, industry.id), query.locale) };
}

/** Convenience wrapper for pages that only need the list. */
export async function getArticles(query: NewsQuery): Promise<Article[]> {
  const result = await getNews(query);
  return result.articles;
}

/**
 * Google News' localised editions often return nothing for a long English keyword
 * query — "pharmacy medicines pharma retail" gives 0 items in Tamil while
 * "pharmacy pharma" gives 7. A query that comes back empty is therefore retried
 * with its first two words before the page gives up and shows the empty state.
 */
export async function getNewsResilient(query: NewsQuery & { q: string }): Promise<NewsResult> {
  const full = await getNews(query);
  if (full.articles.length > 0) return full;

  const words = query.q.trim().split(/\s+/);
  if (words.length < 3) return full;

  const shorter = words.slice(0, 2).join(" ");
  if (shorter === query.q) return full;

  const relaxed = await getNews({ ...query, q: shorter });
  return relaxed.articles.length > 0 ? relaxed : full;
}
