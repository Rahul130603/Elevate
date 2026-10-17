/**
 * Warms the page cache after the server starts.
 *
 * Every page is statically rendered and revalidated in the background, so the
 * first request to a cold route is the slow one (feed fetch plus picture
 * lookups). Fetching each home and section page once at startup means the reader
 * never pays that cost, and clicks between sections feel instant.
 *
 * Usage: node scripts/warmup.mjs   (BASE_URL / PORT can override the target)
 */
const BASE = (process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/+$/, "");

const LOCALES = ["en", "ta", "bn", "ml", "gu", "hi", "mr"];
const SECTIONS = ["industry", "politics", "world", "technology", "science", "sports", "business", "legal", "health"];
/** Industries are only warmed for the first locale: the rest are prefetched on hover. */
const INDUSTRIES = [
  "finance",
  "it-software",
  "publishing",
  "culinary-hospitality",
  "healthcare-medical",
  "manufacturing",
  "retail-ecommerce",
  "real-estate",
  "education-edtech",
  "media-entertainment",
  "logistics",
  "energy",
  "agriculture-food",
  "automobile",
  "textiles-apparel",
  "travel-tourism",
  "advertising-marketing",
  "animation-vfx",
];

const targets = LOCALES.flatMap((locale) => [
  `/${locale}`,
  ...SECTIONS.map((section) => `/${locale}/${section}`),
  `/${locale}/weather`,
  ...(locale === LOCALES[0] ? INDUSTRIES.map((industry) => `/${locale}/industry/${industry}`) : []),
]);

const CONCURRENCY = 4;
let done = 0;
const started = Date.now();

async function warm(url) {
  try {
    const res = await fetch(`${BASE}${url}`, { signal: AbortSignal.timeout(60_000) });
    await res.arrayBuffer();
    done += 1;
    if (process.env.WARMUP_VERBOSE) console.log(`  ${res.status} ${url} (${Date.now() - started}ms)`);
  } catch {
    /* the server may not be listening yet — the next run covers it */
  }
}

const queue = [...targets];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (next) await warm(next);
    }
  }),
);

console.log(`warm-up: ${done}/${targets.length} pages in ${Math.round((Date.now() - started) / 1000)}s`);
