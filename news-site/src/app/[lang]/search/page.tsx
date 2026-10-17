import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/EmptyState";
import { SearchBox } from "@/components/SearchBox";
import { SectionHeading } from "@/components/SectionHeading";
import { StoryCard } from "@/components/StoryCard";
import { FeedNotice } from "@/components/FeedNotice";
import { getSection, subCategoryHref } from "@/lib/categories";
import { categoryLabel, getDict, isLocale, type Locale } from "@/lib/i18n";
import { getNews } from "@/lib/news";
import Link from "next/link";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDict(lang);

  return {
    title: dict.searchResults,
    description: dict.searchHint,
    alternates: { canonical: `/${lang}/search` },
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const locale: Locale = lang;
  const dict = getDict(locale);

  const rawQuery = (await searchParams).q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : (rawQuery ?? "")).trim().slice(0, 120);

  // Search results skip the picture lookups: those add seconds to every new query
  // (search pages are not cached). The count is kept modest so the page stays
  // light — a phone renders two dozen cards far faster than forty.
  const result = query
    ? await getNews({ locale, category: "top", q: query, limit: 24, withImages: false })
    : null;
  const articles = result?.articles ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="max-w-2xl">
        <h1 className="headline text-2xl font-black tracking-tight sm:text-3xl">
          {dict.searchResults}
        </h1>
        {query ? (
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            “<span className="font-semibold text-ink-700 dark:text-ink-200">{query}</span>” ·{" "}
            {articles.length} {dict.stories}
          </p>
        ) : null}
        <div className="mt-4">
          <SearchBox locale={locale} dict={dict} defaultValue={query} autoFocus />
        </div>
      </div>

      <div className="mt-8">
        {!query ? (
          <div>
            <p className="text-sm text-ink-500 dark:text-ink-400">{dict.searchHint}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {getSection("industry").subs.map((sub) => (
                <li key={sub.id}>
                  <Link
                    href={subCategoryHref(locale, "industry", sub.id)}
                    className="inline-flex rounded-full border border-ink-200 px-3 py-1.5 text-sm text-ink-700 transition hover:border-brand-400 hover:text-brand-700 dark:border-ink-800 dark:text-ink-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
                  >
                    {sub.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            {result && !result.ok ? (
              <div className="mb-6">
                <FeedNotice dict={dict} />
              </div>
            ) : null}

            {articles.length === 0 ? (
              <EmptyState
                title={dict.noResults}
                body={dict.searchHint}
                locale={locale}
                dict={dict}
                suggestions
              />
            ) : (
              <section aria-labelledby="search-heading">
                <SectionHeading id="search-heading" title={dict.latest} />
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {articles.map((article) => (
                    <StoryCard
                      key={article.id}
                      article={article}
                      dict={dict}
                      locale={locale}
                      showCategory
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
