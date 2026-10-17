/**
 * Real story images.
 *
 * Google News RSS ships no images, and its article links are opaque
 * `news.google.com/rss/articles/<id>` URLs. To show the photo a publisher
 * actually attached to a story we:
 *
 *   1. read the article page (for its `data-n-a-sg` signature + `data-n-a-ts`
 *      timestamp, which Google now requires to authorise the lookup)
 *   2. POST those to Google's own `batchexecute` endpoint to get the real
 *      publisher URL back
 *   3. fetch the publisher page and read its `og:image`
 *
 * Everything is cached per article (default 6h) and de-duplicated in flight, and
 * the whole thing is best-effort: any failure just returns null and the card
 * falls back to its generated artwork. Publishers that block bots (Bloomberg,
 * for example) simply never get a photo.
 *
 * Set NEWS_IMAGES=off to disable the lookups entirely.
 */

import type { Article } from "./news";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** How long a resolved image is trusted, in seconds. */
const IMAGE_TTL_SECONDS = 6 * 60 * 60;
/** Failures are retried much sooner: they are usually throttling, not permanent. */
const FAILURE_TTL_MS = 10 * 60 * 1000;
/**
 * How many stories per page get a looked-up photo. Each lookup costs two requests
 * (a ~600 KB article page plus the decoder call), so this stays deliberately
 * modest: the top stories are what readers actually see, and large budgets are
 * what get an IP rate-limited by Google.
 */
export const IMAGE_BUDGET = 12;
/** Parallel lookups. Higher values are what trigger throttling. */
const CONCURRENCY = 2;
/** Attempts per network step (the first try plus retries). */
const ATTEMPTS = 2;
/**
 * Hard ceiling on the time picture lookups may add to a page render. It used to
 * be 12s, which made the first visit to a cold section feel broken; the rest of
 * the stories simply keep their artwork, and the 6h positive cache means a
 * warmed page is complete anyway.
 */
const RENDER_BUDGET_MS = 2_000;
const GOOGLE_TIMEOUT_MS = 3_000;
const PUBLISHER_TIMEOUT_MS = 3_500;

export const imagesEnabled = (process.env.NEWS_IMAGES ?? "on").toLowerCase() !== "off";

type CacheEntry = { at: number; image: string | null };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

/**
 * Circuit breaker. Google's decode endpoint answers 429 once it has seen too many
 * lookups from one IP; without this, every page render would still fire its full
 * batch of requests (20 stories ≈ 40 calls) and add seconds to the render.
 */
let decodePausedUntil = 0;
const DECODE_COOLDOWN_MS = 5 * 60 * 1000;

function pauseDecoding() {
  decodePausedUntil = Date.now() + DECODE_COOLDOWN_MS;
}

export function decodingPaused(): boolean {
  return Date.now() < decodePausedUntil;
}

function requestInit(revalidateSeconds: number, timeoutMs: number) {
  return {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
    },
    next: { revalidate: revalidateSeconds },
    signal: AbortSignal.timeout(timeoutMs),
  } as const;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const hostLocks = new Map<string, Promise<void>>();

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

/**
 * Runs one request at a time per host. Hitting the same news site with several
 * parallel requests gets the connections reset — which surfaces as
 * `fetch failed` — so requests to a host are chained instead.
 */
function withHostLock<T>(url: string, task: () => Promise<T>): Promise<T> {
  const host = hostOf(url);
  const previous = hostLocks.get(host) ?? Promise.resolve();
  const run = previous.then(task, task);
  hostLocks.set(
    host,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

/**
 * Connection resets and timeouts are common when a dozen publisher pages are
 * fetched at once, so every network step gets one spaced-out retry — unless the
 * render's deadline has already passed, in which case the story keeps its artwork.
 */
async function withRetry<T>(task: () => Promise<T | null>, label: string, deadline?: number): Promise<T | null> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    if (typeof deadline === "number" && Date.now() >= deadline) break;
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt < ATTEMPTS) await sleep(400 * attempt);
    }
  }

  if (lastError) {
    const cause = (lastError as { cause?: { code?: string } })?.cause?.code;
    console.error(
      `[images] ${label} failed:`,
      `${(lastError as Error)?.message}${cause ? ` (${cause})` : ""}`,
    );
  }
  return null;
}

function googleNewsArticleId(url: string): string | null {
  if (!url.includes("news.google.com")) return null;
  const id = url.split("/articles/")[1]?.split("?")[0]?.split("/")[0];
  return id || null;
}

/** Step 1 + 2: opaque Google News link -> real publisher URL. */
export async function resolvePublisherUrl(articleUrl: string): Promise<string | null> {
  const articleId = googleNewsArticleId(articleUrl);
  // Anything that is not a Google News redirect is already a publisher URL.
  if (!articleId) return articleUrl.startsWith("http") ? articleUrl : null;

  const pageResponse = await fetch(
    `https://news.google.com/rss/articles/${articleId}`,
    requestInit(IMAGE_TTL_SECONDS, GOOGLE_TIMEOUT_MS),
  );
  if (pageResponse.status === 429) {
    pauseDecoding();
    return null;
  }
  if (!pageResponse.ok) return null;

  const page = await pageResponse.text();
  const signature = page.match(/data-n-a-sg="([^"]+)"/)?.[1];
  const timestamp = page.match(/data-n-a-ts="([^"]+)"/)?.[1];
  if (!signature || !timestamp) return null;

  const inner = JSON.stringify([
    "garturlreq",
    [
      ["en-US", "US", ["FINANCE_TOP_INDICES", "WEB_TEST_1_0_0"], null, null, 1, 1, "US:en", null, 180, null, null, null, null, null, 0, null, null, [1608992183, 723341000]],
      "en-US",
      "US",
      1,
      [2, 3, 4, 8],
      1,
      0,
      "655000234",
      0,
      0,
      null,
      0,
    ],
    articleId,
    timestamp,
    signature,
  ]);

  const decodeResponse = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent": USER_AGENT,
    },
    body: `f.req=${encodeURIComponent(JSON.stringify([[["Fbv4je", inner, null, "generic"]]]))}`,
    next: { revalidate: IMAGE_TTL_SECONDS },
    signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
  });
  if (decodeResponse.status === 429) {
    pauseDecoding();
    return null;
  }
  if (!decodeResponse.ok) return null;

  const body = await decodeResponse.text();
  const candidates = [...body.matchAll(/https?:\\?\/\\?\/[^"\\\s]+/g)]
    .map((match) => match[0].replace(/\\\//g, "/"))
    .filter((url) => !url.includes("news.google.com") && !url.includes("googleusercontent.com"));

  return candidates[0] ?? null;
}

const OG_PATTERNS = [
  /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i,
  /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
];

/** Step 3: publisher page -> its social preview image, absolute and usable. */
async function scrapePreviewImage(publisherUrl: string): Promise<string | null> {
  const response = await withHostLock(publisherUrl, () =>
    fetch(publisherUrl, {
      ...requestInit(IMAGE_TTL_SECONDS, PUBLISHER_TIMEOUT_MS),
      redirect: "follow",
    }),
  );
  if (!response.ok) return null;

  const html = await response.text();
  const head = html.slice(0, 200_000); // preview tags live in <head>

  for (const pattern of OG_PATTERNS) {
    const raw = head.match(pattern)?.[1];
    if (!raw) continue;

    const candidate = raw.trim().replace(/&amp;/g, "&");
    if (!candidate || candidate.startsWith("data:")) continue;

    try {
      const absolute = new URL(candidate, response.url);
      if (absolute.protocol !== "https:" && absolute.protocol !== "http:") continue;
      return absolute.toString();
    } catch {
      continue;
    }
  }

  return null;
}

function isFresh(entry: CacheEntry) {
  const ttl = entry.image ? IMAGE_TTL_SECONDS * 1000 : FAILURE_TTL_MS;
  return Date.now() - entry.at < ttl;
}

function cleanSearchTitle(title: string): string {
  return title
    .replace(/[‘'’“”"«»]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 8)
    .join(" ");
}

/** Resolves an image for a news story using search. */
export async function resolveImageFromSearch(title?: string, source?: string): Promise<string | null> {
  if (!title) return null;
  const cleaned = cleanSearchTitle(title);
  if (!cleaned) return null;
  const q = `${cleaned} ${source || ""}`.trim();
  try {
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(q)}`, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(3500),
    });
    if (!tokenRes.ok) return null;
    const tokenText = await tokenRes.text();
    const vqd = tokenText.match(/vqd=["']([^"']+)["']/)?.[1] || tokenText.match(/vqd=([0-9-]+)/)?.[1];
    if (!vqd) return null;

    const imgRes = await fetch(`https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}`, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(4000),
    });
    if (!imgRes.ok) return null;
    const data = (await imgRes.json()) as { results?: Array<{ image?: string }> };
    if (data.results && data.results.length > 0) {
      const url = data.results[0].image;
      if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
        return url;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** Resolves (and caches) one story image. Never throws. */
export async function resolveArticleImage(
  articleUrl: string,
  title?: string,
  source?: string,
  /** Epoch ms by which this lookup must stop, so one slow story cannot hold a render. */
  deadline?: number,
): Promise<string | null> {
  if (!imagesEnabled) return null;

  const cached = cache.get(articleUrl);
  if (cached && isFresh(cached)) return cached.image;

  const pending = inflight.get(articleUrl);
  if (pending) return pending;

  const outOfTime = () => typeof deadline === "number" && Date.now() >= deadline;

  const task = (async () => {
    // 1. Try decoding publisher URL if Google decode is not throttled
    if (!decodingPaused() && !outOfTime()) {
      const publisherUrl = await withRetry(
        () => resolvePublisherUrl(articleUrl),
        `decode ${articleUrl.slice(-30)}`,
        deadline,
      );
      if (publisherUrl && !outOfTime()) {
        const image = await withRetry(
          () => scrapePreviewImage(publisherUrl),
          `scrape ${publisherUrl.slice(0, 40)}`,
          deadline,
        );
        if (image) return image;
      }
    }

    // 2. Direct search fallback for story photo (fast, reliable, never blocked by Google 429)
    if (title && !outOfTime()) {
      const searchImage = await resolveImageFromSearch(title, source);
      if (searchImage) return searchImage;
    }

    return null;
  })()
    .then((image) => {
      cache.set(articleUrl, { at: Date.now(), image });
      return image;
    })
    .finally(() => inflight.delete(articleUrl));

  inflight.set(articleUrl, task);
  return task;
}

/** Runs `task` over `items` with a fixed number of workers and a time ceiling. */
async function mapLimited<T>(items: T[], limit: number, task: (item: T, deadline: number) => Promise<void>, budgetMs: number) {
  const startedAt = Date.now();
  const deadline = startedAt + budgetMs;
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      if (Date.now() > deadline) return; // keep the render responsive
      await task(items[index], deadline);
    }
  });

  await Promise.all(workers);
}

/**
 * Returns the list with `image` filled in for the first `budget` stories that
 * resolve. Stories whose publisher blocks us keep `image: null` and are drawn
 * with the generated artwork instead.
 */
export async function attachImages(articles: Article[], budget = IMAGE_BUDGET): Promise<Article[]> {
  if (!imagesEnabled || articles.length === 0) return articles;

  const targets = articles.slice(0, budget);
  const resolved = new Map<string, string>();

  await mapLimited(
    targets,
    CONCURRENCY,
    async (article, deadline) => {
      if (article.image) return; // feed already provided one
      const image = await resolveArticleImage(article.url, article.title, article.source, deadline);
      if (image) resolved.set(article.id, image);
    },
    RENDER_BUDGET_MS,
  );

  if (resolved.size === 0) return articles;

  return articles.map((article) => {
    const image = resolved.get(article.id);
    return image ? { ...article, image } : article;
  });
}
