import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EmptyState, JsonLd } from "@/components/EmptyState";
import { FeedNotice } from "@/components/FeedNotice";
import { NewsTicker } from "@/components/NewsTicker";
import { SectionHeading } from "@/components/SectionHeading";
import { LeadStory, StoryCard } from "@/components/StoryCard";
import { TrendingBand } from "@/components/TrendingBand";
import {
  CATEGORY_DESCRIPTION,
  getSection,
  isCategory,
  specialityHref,
  subCategoryHref,
  type Category,
  type SectionId,
  type SubCategory,
} from "@/lib/categories";
import { categoryLabel, getDict, isLocale, localeMeta, type Locale } from "@/lib/i18n";
import { attachImages } from "@/lib/images";
import { filterAnyIndustryArticles } from "@/lib/industry-relevance";
import { dedupeArticles, excludeArticles, getNews, getNewsResilient, sortArticles } from "@/lib/news";
import type { Article } from "@/lib/news-types";
import { languageAlternates } from "@/lib/seo";
import { site } from "@/lib/site";

/**
 * Rendered as ISR: the page is generated on demand, cached, then revalidated
 * every 5 minutes. Being static (rather than a streamed dynamic hole) is what
 * lets `notFound()` and `redirect()` below answer with a real 404 / 307 status.
 */
export const dynamic = "force-dynamic";
export const revalidate = 300;

type PageProps = { params: Promise<{ lang: string; category: string }> };

/**
 * Runs `task` over `items` in fixed-size batches. Eighteen simultaneous feed
 * requests is what gets an IP throttled by Google News, and a throttled industry
 * would silently shrink the hub's pool.
 */
async function inBatches<T, R>(
  items: readonly T[],
  size: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += size) {
    results.push(...(await Promise.all(items.slice(index, index + size).map(task))));
  }
  return results;
}

/**
 * The industry section is a hub, not a beat: it pools one feed per industry
 * instead of showing a single query's news. Every story then has to read as
 * industry news at all (see `industry-relevance`), so the hub cannot quietly turn
 * into a second front page.
 */
async function industryHubNews(
  locale: Locale,
  industries: readonly SubCategory[],
): Promise<{ articles: Article[]; ok: boolean }> {
  const results = await inBatches(industries, 6, (industry) =>
    getNews({
      locale,
      category: "industry",
      q: industry.feed.kind === "query" ? industry.feed.query : industry.label,
      limit: 8,
      withImages: false,
    }),
  );

  const pool = sortArticles(dedupeArticles(results.flatMap((result) => result.articles)));
  const selected = filterAnyIndustryArticles(pool, 12).slice(0, 30);
  // One image budget for the whole hub — the individual feeds skip pictures so a
  // cold render cannot fire 18 × 8 publisher lookups.
  const articles = await attachImages(selected);

  return { articles, ok: results.some((result) => result.ok) };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, category } = await params;
  if (!isLocale(lang) || !isCategory(category) || category === "top") return {};

  const dict = getDict(lang);
  const label = categoryLabel(dict, category);
  const description = `${label} — ${CATEGORY_DESCRIPTION[category]}. ${site.name}, ${dict.edition}.`;

  return {
    title: label,
    description,
    alternates: {
      canonical: `/${lang}/${category}`,
      languages: languageAlternates((locale) => `/${locale}/${category}`),
    },
    openGraph: {
      url: `/${lang}/${category}`,
      type: "website",
      locale: localeMeta[lang].intl.replace("-", "_"),
      title: `${label} · ${site.name}`,
      description,
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { lang, category } = await params;
  if (!isLocale(lang)) notFound();
  if (!isCategory(category)) notFound();
  // `/en/top` is the front page; keep one canonical URL for it.
  if (category === "top") redirect(`/${lang}`);

  const locale: Locale = lang;
  const section: Category = category;
  const dict = getDict(locale);
  const sectionData = getSection(section as SectionId);
  const isIndustryHub = section === "industry";

  // Keyword-backed sections (politics, legal, …) get the long-query retry too;
  // the industry hub has no single query, so it pools every industry instead.
  const sectionFeed = sectionData.feed;
  const result = isIndustryHub
    ? await industryHubNews(locale, sectionData.subs)
    : sectionFeed.kind === "query"
      ? await getNewsResilient({ locale, category: section, q: sectionFeed.query, limit: 30 })
      : await getNews({ locale, category: section, limit: 30 });
  const articles = result.articles;
  const [lead, ...rest] = articles;
  const grid = rest.slice(0, 12);
  const shown = [lead, ...grid].filter(Boolean);
  const trending = excludeArticles(articles, shown).slice(0, 6);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${categoryLabel(dict, section)} · ${site.name}`,
    inLanguage: localeMeta[locale].intl,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: Math.min(articles.length, 10),
      itemListElement: articles.slice(0, 10).map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: article.title,
        url: article.url,
      })),
    },
  };

  return (
    <>
      <JsonLd data={itemList} id="section-structured-data" />
      <NewsTicker articles={articles} locale={locale} dict={dict} />

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            {dict.edition}
          </p>
          <h1 className="headline mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            {categoryLabel(dict, section)}
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {CATEGORY_DESCRIPTION[section]}
          </p>

          {/* The industry hub shows every industry and its sub-sections, so
              "Industry" never lands on one industry's news by accident. */}
          {isIndustryHub ? (
            <div className="mt-6">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
                {dict.browseIndustries}
              </h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sectionData.subs.map((industry) => (
                  <li
                    key={industry.id}
                    className="rounded-2xl border border-ink-200 p-4 transition hover:border-brand-400 dark:border-ink-800 dark:hover:border-brand-500"
                  >
                    <Link
                      href={subCategoryHref(locale, section, industry.id)}
                      className="block text-sm font-bold text-ink-800 hover:text-brand-700 dark:text-ink-100 dark:hover:text-brand-400"
                    >
                      {industry.label}
                    </Link>

                    {industry.subs?.length ? (
                      <ul className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                        {industry.subs.map((entry) => (
                          <li key={entry.id} className="flex items-center gap-2">
                            <Link
                              href={specialityHref(locale, section, industry.id, entry.id)}
                              className="text-[12.5px] text-ink-500 transition hover:text-brand-700 dark:text-ink-400 dark:hover:text-brand-400"
                            >
                              {entry.label}
                            </Link>
                            <span aria-hidden="true" className="text-ink-300 dark:text-ink-600">
                              ·
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            /* Sub-category shortcuts for this section */
            <ul className="mt-4 flex flex-wrap gap-2">
              {sectionData.subs.map((sub) => (
                <li key={sub.id}>
                  <Link
                    href={subCategoryHref(locale, section, sub.id)}
                    className="inline-flex rounded-full border border-ink-200 px-3 py-1.5 text-sm text-ink-700 transition hover:border-brand-400 hover:text-brand-700 dark:border-ink-800 dark:text-ink-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
                  >
                    {sub.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!result.ok ? (
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
            <section aria-labelledby="section-lead">
              <SectionHeading
                id="section-lead"
                title={isIndustryHub ? dict.industryNews : categoryLabel(dict, section)}
              />
              <div className="grid gap-6 md:grid-cols-2">
                <LeadStory article={lead} dict={dict} locale={locale} />
                <div className="grid content-start gap-6 sm:grid-cols-2 md:grid-cols-1 md:gap-5">
                  {rest.slice(0, 2).map((article) => (
                    <StoryCard key={article.id} article={article} dict={dict} locale={locale} />
                  ))}
                </div>
              </div>
            </section>

            {grid.length > 2 ? (
              <section aria-labelledby="section-more">
                <SectionHeading id="section-more" title={dict.moreStories} />
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {grid.slice(2).map((article) => (
                    <StoryCard key={article.id} article={article} dict={dict} locale={locale} />
                  ))}
                </div>
              </section>
            ) : null}

            <TrendingBand
              articles={trending}
              title={dict.moreStories}
              locale={locale}
              dict={dict}
            />
          </div>
        )}
      </div>
    </>
  );
}
