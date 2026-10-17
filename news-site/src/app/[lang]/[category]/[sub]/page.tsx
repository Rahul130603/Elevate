import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState, JsonLd } from "@/components/EmptyState";
import { FeedNotice } from "@/components/FeedNotice";
import { NewsTicker } from "@/components/NewsTicker";
import { SectionHeading } from "@/components/SectionHeading";
import { LeadStory, StoryCard } from "@/components/StoryCard";
import { TrendingBand } from "@/components/TrendingBand";
import {
  categoryHref,
  getSection,
  getSubCategory,
  isSection,
  specialityHref,
  subCategoryHref,
  type SectionId,
} from "@/lib/categories";
import { categoryLabel, getDict, isLocale, localeMeta, type Locale } from "@/lib/i18n";
import { filterIndustryArticles } from "@/lib/industry-relevance";
import { dedupeArticles, excludeArticles, getNews, getNewsResilient, sortArticles } from "@/lib/news";
import { absoluteUrl, languageAlternates } from "@/lib/seo";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 300;

/** Below this, the industry's own sub-section feeds top the page up. */
const MIN_INDUSTRY_STORIES = 10;

type PageProps = { params: Promise<{ lang: string; category: string; sub: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, category, sub } = await params;
  if (!isLocale(lang) || !isSection(category)) return {};

  const subCategory = getSubCategory(category, sub);
  if (!subCategory) return {};

  const dict = getDict(lang);
  const sectionLabel = categoryLabel(dict, category);
  const description = `${subCategory.label} — ${sectionLabel}. ${site.name}, ${dict.edition}.`;

  return {
    title: `${subCategory.label} · ${sectionLabel}`,
    description,
    alternates: {
      canonical: `/${lang}/${category}/${sub}`,
      languages: languageAlternates((locale) => `/${locale}/${category}/${sub}`),
    },
    openGraph: {
      url: `/${lang}/${category}/${sub}`,
      type: "website",
      locale: localeMeta[lang].intl.replace("-", "_"),
      title: `${subCategory.label} · ${sectionLabel} · ${site.name}`,
      description,
    },
  };
}

export default async function SubCategoryPage({ params }: PageProps) {
  const { lang, category, sub } = await params;
  if (!isLocale(lang)) notFound();
  if (!isSection(category)) notFound();

  const section: SectionId = category;
  const sectionData = getSection(section);
  const subCategory = getSubCategory(section, sub);
  if (!subCategory) notFound();

  const locale: Locale = lang;
  const dict = getDict(locale);
  const sectionLabel = categoryLabel(dict, section);

  // Sub-category feeds are keyword queries, so the same long-query retry applies.
  const feedQuery = subCategory.feed.kind === "query" ? subCategory.feed.query : subCategory.label;
  const result = await getNewsResilient({ locale, category: section, q: feedQuery, limit: 30 });

  /*
   * An industry page is the industry's home: only that industry's stories may
   * appear. The keyword feed behind it is topical rather than exclusive, so the
   * signature filter (see `industry-relevance`) drops anything that belongs to
   * another industry — or to no industry at all.
   */
  const isIndustryPage = section === "industry" && !!subCategory.subs?.length;
  let articles = isIndustryPage
    ? filterIndustryArticles(result.articles, subCategory.id)
    : result.articles;

  /*
   * If the industry's own feed came back thin, its sub-sections' feeds top the
   * page up. They are the same industry, so the "only this industry" rule holds.
   */
  if (isIndustryPage && articles.length < MIN_INDUSTRY_STORIES) {
    const feeds = await Promise.all(
      (subCategory.subs ?? []).slice(0, 4).map((entry) =>
        getNews({
          locale,
          category: section,
          q: entry.feed.kind === "query" ? entry.feed.query : entry.label,
          limit: 8,
          withImages: false,
        }),
      ),
    );
    const extra = filterIndustryArticles(
      dedupeArticles(feeds.flatMap((feed) => feed.articles)),
      subCategory.id,
    );
    articles = sortArticles([...articles, ...excludeArticles(extra, articles)]).slice(0, 30);
  }
  const [lead, ...rest] = articles;
  const grid = rest.slice(0, 12);
  const shown = [lead, ...grid].filter(Boolean);
  const trending = excludeArticles(articles, shown).slice(0, 6);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${subCategory.label} · ${sectionLabel} · ${site.name}`,
    inLanguage: localeMeta[locale].intl,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: dict.home, item: absoluteUrl(`/${locale}`) },
        {
          "@type": "ListItem",
          position: 2,
          name: sectionLabel,
          item: absoluteUrl(categoryHref(locale, section)),
        },
        {
          "@type": "ListItem",
          position: 3,
          name: subCategory.label,
          item: absoluteUrl(subCategoryHref(locale, section, subCategory.id)),
        },
      ],
    },
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
      <JsonLd data={structuredData} id="sub-structured-data" />
      <NewsTicker articles={articles} locale={locale} dict={dict} />

      <div className="mx-auto max-w-7xl px-4 py-6">
        <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
          <Link href={`/${locale}`} className="hover:text-brand-700 dark:hover:text-brand-400">
            {dict.home}
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href={categoryHref(locale, section)}
            className="font-medium hover:text-brand-700 dark:hover:text-brand-400"
          >
            {sectionLabel}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-ink-700 dark:text-ink-200">{subCategory.label}</span>
        </nav>

        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            {sectionLabel}
          </p>
          <h1 className="headline mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            {subCategory.label}
          </h1>
        </div>

        {/*
          Chips show what belongs *under* this page. An industry lists its own
          sections (Medical -> Pharmacy, Physiotherapy, …); a plain sub-category
          lists its sibling sub-categories, as before.
        */}
        <div
          className={
            isIndustryPage
              ? "mb-6 rounded-2xl border border-ink-200 p-4 dark:border-ink-800"
              : "mb-6"
          }
        >
          {isIndustryPage ? (
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
              {dict.sections} · {subCategory.label}
            </h2>
          ) : null}

          <ul className="flex flex-wrap gap-2">
            {subCategory.subs?.length
              ? subCategory.subs.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={specialityHref(locale, section, subCategory.id, entry.id)}
                      className="inline-flex rounded-full border border-ink-200 px-3 py-1.5 text-sm text-ink-700 transition hover:border-brand-400 hover:text-brand-700 dark:border-ink-800 dark:text-ink-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
                    >
                      {entry.label}
                    </Link>
                  </li>
                ))
              : sectionData.subs.map((sibling) => {
                  const isCurrent = sibling.id === subCategory.id;
                  return (
                    <li key={sibling.id}>
                      <Link
                        href={subCategoryHref(locale, section, sibling.id)}
                        aria-current={isCurrent ? "page" : undefined}
                        className={`inline-flex rounded-full border px-3 py-1.5 text-sm transition ${
                          isCurrent
                            ? "border-brand-600 bg-brand-600 text-white"
                            : "border-ink-200 text-ink-700 hover:border-brand-400 hover:text-brand-700 dark:border-ink-800 dark:text-ink-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
                        }`}
                      >
                        {sibling.label}
                      </Link>
                    </li>
                  );
                })}

            {subCategory.subs?.length ? (
              <li>
                <Link
                  href={categoryHref(locale, section)}
                  className="inline-flex rounded-full border border-dashed border-ink-300 px-3 py-1.5 text-sm text-ink-500 transition hover:border-brand-400 hover:text-brand-700 dark:border-ink-700 dark:text-ink-400"
                >
                  ← {sectionLabel}
                </Link>
              </li>
            ) : null}
          </ul>
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
            <section aria-labelledby="sub-lead">
              <SectionHeading id="sub-lead" title={subCategory.label} />
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
              <section aria-labelledby="sub-more">
                <SectionHeading id="sub-more" title={dict.moreStories} />
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
