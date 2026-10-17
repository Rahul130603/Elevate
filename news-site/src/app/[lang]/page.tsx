import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmptyState, JsonLd } from "@/components/EmptyState";
import { FeedNotice } from "@/components/FeedNotice";
import { NewStoriesPill } from "@/components/NewStoriesPill";
import { NewsTicker } from "@/components/NewsTicker";
import { SectionHeading } from "@/components/SectionHeading";
import { LeadStory, StoryCard } from "@/components/StoryCard";
import { TrendingBand } from "@/components/TrendingBand";
import { getDict, isLocale, localeMeta, type Locale } from "@/lib/i18n";
import { excludeArticles, getNews } from "@/lib/news";
import { absoluteUrl, languageAlternates } from "@/lib/seo";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 300;

type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDict(lang);
  const description = `${dict.topStories} · ${dict.business} · ${dict.technology} · ${dict.sports} — ${dict.tagline}.`;

  return {
    title: { absolute: `${site.name} — ${dict.tagline}` },
    description,
    alternates: {
      canonical: `/${lang}`,
      languages: languageAlternates((locale) => `/${locale}`),
    },
    openGraph: {
      url: `/${lang}`,
      type: "website",
      locale: localeMeta[lang].intl.replace("-", "_"),
      title: `${site.name} — ${dict.tagline}`,
      description,
    },
  };
}

export default async function HomePage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const locale: Locale = lang;
  const dict = getDict(locale);

  // Front page + a Business strip, fetched in parallel and cached by the provider.
  const [top, business] = await Promise.all([
    getNews({ locale, category: "top", limit: 30 }),
    getNews({ locale, category: "business", limit: 8 }),
  ]);

  const articles = top.articles;
  const [lead, ...rest] = articles;
  const secondary = rest.slice(0, 2);
  const latest = rest.slice(2, 11);
  // Everything above is already on screen: trending and the Business strip only
  // show stories the visitor has not seen yet on this page.
  const shown = [lead, ...secondary, ...latest].filter(Boolean);
  const trending = excludeArticles(articles, shown).slice(0, 6);
  const businessStories = excludeArticles(business.articles, shown).slice(0, 4);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${site.name} — ${dict.topStories} (${localeMeta[locale].english})`,
    inLanguage: localeMeta[locale].intl,
    numberOfItems: Math.min(articles.length, 10),
    itemListElement: articles.slice(0, 10).map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: article.title,
      url: article.url,
    })),
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: site.name,
    url: absoluteUrl(`/${locale}`),
    description: dict.tagline,
    knowsLanguage: [localeMeta[locale].intl],
    publishingPrinciples: absoluteUrl(`/${locale}`),
  };

  return (
    <>
      <JsonLd data={itemList} id="home-item-list" />
      <JsonLd data={organization} id="home-organization" />

      <NewsTicker articles={articles} locale={locale} dict={dict} />

      <div className="mx-auto max-w-7xl px-4 py-6">
        {!top.ok ? (
          <div className="mb-6">
            <FeedNotice dict={dict} />
          </div>
        ) : null}

        {!lead ? (
          <EmptyState
            title={dict.apiErrorShort}
            body={dict.apiError}
            locale={locale}
            dict={dict}
            suggestions
          />
        ) : (
          <div className="space-y-10">
            <section aria-labelledby="top-heading">
              <SectionHeading id="top-heading" title={dict.topStories} />
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2">
                  <LeadStory article={lead} dict={dict} locale={locale} liveLabel={dict.live} />
                </div>
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-1">
                  {secondary.map((article) => (
                    <StoryCard
                      key={article.id}
                      article={article}
                      dict={dict}
                      locale={locale}
                      showCategory
                      priority
                    />
                  ))}
                </div>
              </div>
            </section>

            <TrendingBand articles={trending} locale={locale} dict={dict} />

            {latest.length > 0 ? (
              <section aria-labelledby="latest-heading">
                <SectionHeading id="latest-heading" title={dict.latest} />
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {latest.map((article) => (
                    <StoryCard key={article.id} article={article} dict={dict} locale={locale} />
                  ))}
                </div>
              </section>
            ) : null}

            {businessStories.length > 0 ? (
              <section aria-labelledby="business-heading">
                <SectionHeading
                  id="business-heading"
                  title={dict.business}
                  href={`/${locale}/business`}
                  viewAllLabel={dict.viewAll}
                />
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {businessStories.map((article) => (
                    <StoryCard key={article.id} article={article} dict={dict} locale={locale} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>

      {/* Tells a reader who left the page open that newer stories have arrived. */}
      <NewStoriesPill locale={locale} dict={dict} />
    </>
  );
}
