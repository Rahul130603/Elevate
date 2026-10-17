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
  getSpeciality,
  getSubCategory,
  isSection,
  specialityHref,
  subCategoryHref,
  type SectionId,
} from "@/lib/categories";
import { categoryLabel, getDict, isLocale, localeMeta, type Locale } from "@/lib/i18n";
import { filterIndustryArticles, filterSubSectionArticles } from "@/lib/industry-relevance";
import { excludeArticles, getNews, getNewsResilient, sortArticles } from "@/lib/news";
import { absoluteUrl, languageAlternates } from "@/lib/seo";
import { site } from "@/lib/site";

/**
 * Third level: an industry's own sub-sections, e.g.
 * /en/industry/healthcare-medical/pharmacy
 *
 * The feed is the sub-section's own keyword query, so the page shows only that
 * field's news. Its siblings are the other sub-sections of the same industry.
 */
export const dynamic = "force-dynamic";
export const revalidate = 300;

/** Below this, the parent industry's feed tops the page up. */
const MIN_SUB_SECTION_STORIES = 10;

type PageProps = {
  params: Promise<{ lang: string; category: string; sub: string; speciality: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, category, sub, speciality } = await params;
  if (!isLocale(lang) || !isSection(category)) return {};

  const parent = getSubCategory(category, sub);
  const entry = getSpeciality(category, sub, speciality);
  if (!parent || !entry) return {};

  const dict = getDict(lang);
  const sectionLabel = categoryLabel(dict, category);
  const description = `${entry.label} — ${parent.label}, ${sectionLabel}. ${site.name}, ${dict.edition}.`;

  return {
    title: `${entry.label} · ${parent.label}`,
    description,
    alternates: {
      canonical: `/${lang}/${category}/${sub}/${speciality}`,
      languages: languageAlternates((locale) => `/${locale}/${category}/${sub}/${speciality}`),
    },
    openGraph: {
      url: `/${lang}/${category}/${sub}/${speciality}`,
      type: "website",
      locale: localeMeta[lang].intl.replace("-", "_"),
      title: `${entry.label} · ${parent.label} · ${site.name}`,
      description,
    },
  };
}

export default async function SpecialityPage({ params }: PageProps) {
  const { lang, category, sub, speciality } = await params;
  if (!isLocale(lang)) notFound();
  if (!isSection(category)) notFound();

  const section: SectionId = category;
  const parent = getSubCategory(section, sub);
  if (!parent) notFound();

  const entry = getSpeciality(section, sub, speciality);
  if (!entry) notFound();

  const locale: Locale = lang;
  const dict = getDict(locale);
  const sectionLabel = categoryLabel(dict, section);
  const siblings = parent.subs ?? [];

  const query = entry.feed.kind === "query" ? entry.feed.query : entry.label;
  const result = await getNewsResilient({ locale, category: section, q: query, limit: 30 });

  /*
   * A sub-section page (SaaS & Products, AI & Machine Learning, …) leads with that
   * sub-section's own stories: sibling industries are filtered out entirely, and
   * other stories from the same industry only pad a page the sub-section cannot
   * fill on its own.
   */
  let articles =
    section === "industry"
      ? filterSubSectionArticles(result.articles, parent.id, entry.id)
      : result.articles;

  /*
   * Narrow sub-sections (AR & VR, Comics, …) sometimes come back with only a
   * handful of stories. The parent industry's own feed tops the page up — still
   * this industry only, never a sibling's news.
   */
  if (section === "industry" && articles.length < MIN_SUB_SECTION_STORIES) {
    const parentQuery = parent.feed.kind === "query" ? parent.feed.query : parent.label;
    const wider = await getNews({
      locale,
      category: section,
      q: parentQuery,
      limit: 30,
      withImages: false,
    });
    const extra = filterIndustryArticles(wider.articles, parent.id);
    articles = sortArticles([...articles, ...excludeArticles(extra, articles)]).slice(0, 30);
  }

  articles = sortArticles(articles);
  const [lead, ...rest] = articles;
  const grid = rest.slice(0, 12);
  const shown = [lead, ...grid].filter(Boolean);
  const trending = excludeArticles(articles, shown).slice(0, 6);

  const trail = [
    { name: dict.home, item: absoluteUrl(`/${locale}`) },
    { name: sectionLabel, item: absoluteUrl(categoryHref(locale, section)) },
    { name: parent.label, item: absoluteUrl(subCategoryHref(locale, section, parent.id)) },
    { name: entry.label, item: absoluteUrl(specialityHref(locale, section, parent.id, entry.id)) },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: trail.map((step, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: step.name,
          item: step.item,
        })),
      },
      {
        "@type": "CollectionPage",
        name: `${entry.label} · ${site.name}`,
        inLanguage: localeMeta[locale].intl,
        isPartOf: { "@type": "WebSite", name: site.name, url: site.url },
      },
    ],
  };

  const sectionData = getSection(section);

  return (
    <>
      <JsonLd data={structuredData} id="speciality-structured-data" />

      <NewsTicker articles={articles} locale={locale} dict={dict} />

      <div className="mx-auto max-w-7xl px-4 py-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-ink-500 dark:text-ink-400">
          <ol className="flex flex-wrap items-center gap-2">
            {trail.map((step, index) => {
              const isLast = index === trail.length - 1;
              return (
                <li key={step.item} className="flex items-center gap-2">
                  {index > 0 ? <span aria-hidden="true">/</span> : null}
                  {isLast ? (
                    <span aria-current="page" className="font-semibold text-ink-700 dark:text-ink-200">
                      {step.name}
                    </span>
                  ) : (
                    <Link href={step.item.replace(site.url, "")} className="hover:text-brand-700 dark:hover:text-brand-400">
                      {step.name}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            {sectionLabel} · {parent.label}
          </p>
          <h1 className="headline mt-1 text-2xl font-black tracking-tight sm:text-3xl">{entry.label}</h1>
        </div>

        {/* Sibling sub-sections of the same industry */}
        <ul className="mb-6 flex flex-wrap gap-2">
          {siblings.map((sibling) => {
            const isCurrent = sibling.id === entry.id;
            return (
              <li key={sibling.id}>
                <Link
                  href={specialityHref(locale, section, parent.id, sibling.id)}
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
          <li>
            <Link
              href={subCategoryHref(locale, section, parent.id)}
              className="inline-flex rounded-full border border-dashed border-ink-300 px-3 py-1.5 text-sm text-ink-500 transition hover:border-brand-400 hover:text-brand-700 dark:border-ink-700 dark:text-ink-400"
            >
              ← {parent.label}
            </Link>
          </li>
        </ul>

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
            <section aria-labelledby="speciality-lead">
              <SectionHeading id="speciality-lead" title={entry.label} />
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
              <section aria-labelledby="speciality-more">
                <SectionHeading id="speciality-more" title={dict.moreStories} />
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {grid.slice(2).map((article) => (
                    <StoryCard key={article.id} article={article} dict={dict} locale={locale} />
                  ))}
                </div>
              </section>
            ) : null}

            <TrendingBand articles={trending} title={dict.moreStories} locale={locale} dict={dict} />

            {/* Other industries, so the reader can move sideways */}
            <section aria-labelledby="other-industries" className="rounded-2xl border border-ink-200 p-4 sm:p-5 dark:border-ink-800">
              <SectionHeading id="other-industries" title={sectionLabel} />
              <ul className="flex flex-wrap gap-2">
                {sectionData.subs
                  .filter((industry) => industry.id !== parent.id)
                  .map((industry) => (
                    <li key={industry.id}>
                      <Link
                        href={subCategoryHref(locale, section, industry.id)}
                        className="inline-flex rounded-full border border-ink-200 px-3 py-1.5 text-sm text-ink-700 transition hover:border-brand-400 hover:text-brand-700 dark:border-ink-800 dark:text-ink-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
                      >
                        {industry.label}
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
