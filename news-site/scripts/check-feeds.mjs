/**
 * Smoke-tests the upstream Google News RSS feeds used by the site:
 * every supported language for the front page and for the Business topic.
 *
 *   npm run feeds:check
 */
const HL = ["en", "hi", "ta", "bn", "ml", "gu", "mr"];
const COUNTRY = process.env.NEWS_COUNTRY || "IN";
const TOPIC = "BUSINESS";

function url(hl, topic) {
  const q = `hl=${hl}&gl=${COUNTRY}&ceid=${COUNTRY}:${hl}`;
  return topic
    ? `https://news.google.com/rss/headlines/section/topic/${topic}?${q}`
    : `https://news.google.com/rss?${q}`;
}

function decode(s = "") {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

const rows = [];
for (const hl of HL) {
  for (const topic of [null, TOPIC]) {
    const target = url(hl, topic);
    try {
      const res = await fetch(target, { headers: { "user-agent": "Mozilla/5.0" } });
      const xml = await res.text();
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
      const first = items[0] || "";
      const title = decode((first.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "");
      const src = decode((first.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || "");
      const hasImg = /<img|media:content|enclosure/.test(first);
      rows.push({
        hl,
        feed: topic || "top",
        status: res.status,
        items: items.length,
        source: src || "-",
        image: hasImg ? "yes" : "no",
        sample: title.slice(0, 46),
      });
    } catch (err) {
      rows.push({ hl, feed: topic || "top", status: "ERR", items: 0, source: "-", image: "-", sample: err.message });
    }
  }
}

console.table(rows);

// Also confirm the search endpoint shape works.
try {
  const res = await fetch(
    `https://news.google.com/rss/search?q=${encodeURIComponent("budget")}&hl=ta&gl=${COUNTRY}&ceid=${COUNTRY}:ta`,
  );
  const xml = await res.text();
  const count = [...xml.matchAll(/<item>/g)].length;
  console.log(`search?q=budget (ta): status=${res.status} items=${count}`);
} catch (err) {
  console.log("search feed failed:", err.message);
}
