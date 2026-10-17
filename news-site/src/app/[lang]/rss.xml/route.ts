import { escapeXml, toRfc822 } from "@/lib/format";
import { categoryLabel, getDict, isLocale, localeMeta } from "@/lib/i18n";
import { getNews, providerAttribution } from "@/lib/news";
import { absoluteUrl } from "@/lib/seo";
import { site } from "@/lib/site";

export const revalidate = 300;

/** Our own feed, re-syndicating the aggregated front page for each language. */
export async function GET(_request: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  if (!isLocale(lang)) {
    return new Response("Not found", { status: 404 });
  }

  const dict = getDict(lang);
  const meta = localeMeta[lang];
  const { articles, ok } = await getNews({ locale: lang, category: "top", limit: 30, withImages: false });

  const selfUrl = absoluteUrl(`/${lang}/rss.xml`);
  const siteLink = absoluteUrl(`/${lang}`);
  const lastBuild = toRfc822(articles[0]?.publishedAt ?? new Date().toISOString());

  const items = articles
    .map((article) =>
      [
        "    <item>",
        `      <title>${escapeXml(article.title)}</title>`,
        `      <link>${escapeXml(article.url)}</link>`,
        `      <guid isPermaLink="false">${escapeXml(`${lang}:${article.id}`)}</guid>`,
        `      <pubDate>${toRfc822(article.publishedAt)}</pubDate>`,
        `      <category>${escapeXml(categoryLabel(dict, article.category))}</category>`,
        article.source
          ? `      <source>${escapeXml(article.source)}</source>`
          : "",
        `      <description>${escapeXml(`${article.title} — ${article.source}`)}</description>`,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${site.name} — ${dict.topStories} (${meta.english})`)}</title>
    <link>${escapeXml(siteLink)}</link>
    <description>${escapeXml(`${dict.tagline}. ${providerAttribution}.`)}</description>
    <language>${escapeXml(meta.intl)}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <generator>${escapeXml(site.name)}</generator>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    status: ok ? 200 : 503,
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
