/**
 * Shared shapes for the news layer.
 *
 * These live in their own module on purpose: `news.ts` (the registry) imports
 * provider *values* from `news-api.ts`, so if the API providers imported their
 * types back from `news.ts` the two modules formed a runtime cycle. Turbopack
 * could then evaluate `news.ts` before `news-api.ts` had defined its providers,
 * which surfaced as `ReferenceError: newsDataProvider is not defined`.
 *
 * Keeping the types here means both sides depend only on this leaf module.
 */

import type { Category, FeedSpec } from "./categories";
import type { Locale } from "./i18n";

export type Article = {
  id: string;
  title: string;
  /** Publisher headline retained for industry validation after translation. */
  originalTitle?: string;
  url: string;
  source: string;
  sourceUrl?: string;
  publishedAt: string | null;
  category: Category;
  locale: Locale;
  image: string | null;
  /** URL-friendly form of the headline. */
  slug: string;
};

export type NewsQuery = {
  locale: Locale;
  category?: Category;
  /** Sub-category slug, e.g. `artificial-intelligence` under `technology`. */
  sub?: string;
  q?: string;
  limit?: number;
  /** Set false to skip the publisher image lookups (used by the RSS output). */
  withImages?: boolean;
};

export type NewsResult = {
  articles: Article[];
  /** false when the upstream request failed (stale cache may still be served). */
  ok: boolean;
  /** true when the payload is older than the revalidate window. */
  stale: boolean;
  fetchedAt: string;
  provider: string;
  feedUrl: string;
};

export type ProviderFetchOptions = {
  locale: Locale;
  category: Category;
  sub?: string;
  q?: string;
  limit: number;
  /** Feed resolved from the taxonomy, so providers share one mapping. */
  feed: FeedSpec | null;
};

export type Provider = {
  id: string;
  label: string;
  /** Homepage / attribution line shown in the footer. */
  attribution: string;
  /** True when this provider is usable right now (its key is configured). */
  enabled: () => boolean;
  fetch: (options: ProviderFetchOptions) => Promise<Article[]>;
};
