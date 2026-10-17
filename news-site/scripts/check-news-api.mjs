/**
 * Validates a news-API key for the keyed providers (NewsData.io / GNews).
 *
 *   npm run api:check
 *
 * Reads .env.local, makes one real request per configured provider and reports
 * exactly what the site depends on: article count, the publisher URL (must not be
 * a Google link) and whether the image URL is actually fetchable. Run this right
 * after pasting a key.
 */
import { readFile } from "node:fs/promises";

const UA = "Mozilla/5.0 (compatible; MeeetlyGlobalNewsBot/1.0)";

const env = {};
try {
  for (const line of (await readFile(".env.local", "utf8")).split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
} catch {
  console.log("No .env.local found — nothing to check.");
  process.exit(0);
}

const LANGUAGE = env.NEWS_API_LANGUAGE || "en";
const COUNTRY = (env.NEWS_COUNTRY || "IN").toLowerCase();

async function describe(article) {
  const url = article.url ?? article.link ?? "";
  const image = article.image ?? article.image_url ?? null;
  const isGoogle = url.includes("news.google.com");
  let imageStatus = "none";
  if (image) {
    try {
      const res = await fetch(image, { headers: { "user-agent": UA }, method: "GET", signal: AbortSignal.timeout(15000) });
      imageStatus = `HTTP ${res.status} ${res.headers.get("content-type") ?? ""}`.trim();
    } catch (error) {
      imageStatus = `FAILED ${error.message}`;
    }
  }
  return {
    title: (article.title ?? "").slice(0, 64),
    publisherUrl: url.slice(0, 70),
    googleLink: isGoogle,
    image: image ? image.slice(0, 62) : "(none)",
    imageStatus,
    description: typeof article.description === "string" ? `${article.description.length} chars` : "(none)",
  };
}

async function checkNewsData(key) {
  const params = new URLSearchParams({ apikey: key, country: COUNTRY, language: LANGUAGE, size: "10", category: "technology" });
  const res = await fetch(`https://newsdata.io/api/1/latest?${params}`, { signal: AbortSignal.timeout(20000) });
  const body = await res.json();
  if (!Array.isArray(body.results)) {
    throw new Error(`${res.status} ${JSON.stringify(body.results ?? body).slice(0, 160)}`);
  }
  return { status: res.status, count: body.results.length, total: body.totalResults, first: body.results[0] };
}

async function checkGNews(key) {
  const params = new URLSearchParams({ apikey: key, lang: LANGUAGE, country: COUNTRY, max: "10", category: "technology" });
  const res = await fetch(`https://gnews.io/api/v4/top-headlines?${params}`, { signal: AbortSignal.timeout(20000) });
  const body = await res.json();
  if (!Array.isArray(body.articles)) {
    throw new Error(`${res.status} ${JSON.stringify(body.errors ?? body).slice(0, 160)}`);
  }
  return { status: res.status, count: body.articles.length, total: body.totalArticles, first: body.articles[0] };
}

const CHECKS = [
  ["NewsData.io", env.NEWSDATA_API_KEY, checkNewsData],
  ["GNews", env.GNEWS_API_KEY, checkGNews],
];

let checked = 0;
for (const [label, key, run] of CHECKS) {
  if (!key) {
    console.log(`${label.padEnd(13)} no key configured`);
    continue;
  }
  checked += 1;
  console.log(`\n=== ${label}`);
  try {
    const result = await run(key);
    console.log(`  status=${result.status} articles=${result.count} total=${result.total ?? "?"}`);
    const detail = await describe(result.first ?? {});
    console.log(`  title      : ${detail.title}`);
    console.log(`  article url: ${detail.publisherUrl}${detail.googleLink ? "   <-- WARNING: still a Google link" : ""}`);
    console.log(`  image      : ${detail.image}`);
    console.log(`  image fetch: ${detail.imageStatus}`);
    console.log(`  description: ${detail.description}`);
    if (detail.googleLink) console.log("  ! The brief needs a real publisher URL; check the provider response mapping.");
    if (!detail.image || detail.imageFetch === "none") console.log("  ! No image in the response — photos would stay as artwork.");
  } catch (error) {
    console.log(`  FAILED: ${error.message}`);
  }
}

if (checked === 0) {
  console.log("\nAdd NEWSDATA_API_KEY or GNEWS_API_KEY to .env.local, then run this again.");
}
