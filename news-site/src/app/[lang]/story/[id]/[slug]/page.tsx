import type { Metadata } from "next";
import { headers } from "next/headers";
import { filterIndustryArticles } from "@/lib/industry-relevance";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StoryMeta } from "@/components/StoryCard";
import { StoryThumb } from "@/components/StoryThumb";
import { ArrowRightIcon, ExternalIcon } from "@/components/icons";
import { QuickBrief } from "@/components/QuickBrief";
import { getBriefCopy } from "@/lib/brief-copy";
import { CATEGORIES } from "@/lib/categories";
import { categoryLabel, getDict, isLocale, type Locale } from "@/lib/i18n";
import { getNews, type Article } from "@/lib/news";
import { resolveArticleImage } from "@/lib/images";
import { site } from "@/lib/site";
import { parseStoryPayload } from "@/lib/story-url";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string; id: string; slug: string }>;
  searchParams: Promise<{ story?: string | string[]; sig?: string | string[] }>;
};

function first(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Recovery path for links whose signature no longer verifies — typically pages
 * cached before STORY_LINK_SECRET was set, or links signed with an older secret.
 * The story is looked up by id in our own feeds, so nothing user-supplied is
 * trusted and the reader gets the story instead of a 404. The id is a stable hash
 * of the original URL plus headline, so it survives both.
 */
async function findArticleById(locale: Locale, id: string): Promise<Article | null> {
  const top = await getNews({ locale, category: "top", limit: 60, withImages: false });
  const fromTop = top.articles.find((article) => article.id === id);
  if (fromTop) return fromTop;

  // Stories clicked from a section page only appear in that section's feed.
  const sections = await Promise.all(
    CATEGORIES.filter((category) => category !== "top").map((category) =>
      getNews({ locale, category, limit: 40, withImages: false }),
    ),
  );
  for (const result of sections) {
    const match = result.articles.find((article) => article.id === id);
    if (match) return match;
  }
  return null;
}

async function articleFromPage({ params, searchParams }: PageProps) {
  const [{ lang, id }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(lang)) return null;

  let article: Article | null = null;
  const verified = parseStoryPayload(first(query.story), first(query.sig));
  if (verified && verified.id === id) {
    article = { ...verified, locale: lang };
  } else {
    const recovered = await findArticleById(lang, id);
    if (recovered) article = { ...recovered, locale: lang };
  }

  if (!article) return null;
  const industry = (await headers()).get("x-elevate-industry") || "";
  if (!filterIndustryArticles([article], industry).length) return null;

  if (!article.image) {
    const img = await resolveArticleImage(article.url, article.title, article.source);
    if (img) article = { ...article, image: img };
  }

  return { article, locale: lang };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const data = await articleFromPage(props);
  if (!data) return {};

  return {
    title: data.article.title,
    description: `${data.article.title} — ${data.article.source}. ${site.name} quick brief.`,
    robots: { index: false, follow: true },
  };
}

export default async function StoryPage(props: PageProps) {
  const data = await articleFromPage(props);
  if (!data) notFound();

  const { article } = data;
  const locale: Locale = data.locale;
  const dict = getDict(locale);
  const copy = getBriefCopy(locale);
  const query = await props.searchParams;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <Link
        href={`/${locale}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-ink-600 transition hover:text-brand-700 dark:text-ink-300 dark:hover:text-brand-400"
      >
        <span aria-hidden="true">←</span>
        {copy.back}
      </Link>

      <article className="mt-5 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm dark:border-ink-800 dark:bg-ink-950">
        <StoryThumb
          seed={article.id}
          source={article.source}
          category={article.category}
          locale={locale}
          image={article.image}
          priority
          className="aspect-[16/9] w-full"
        />

        <div className="p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
              {categoryLabel(dict, article.category)}
            </span>
            <span className="rounded-full border border-ink-200 px-3 py-1 text-[11px] font-semibold text-ink-600 dark:border-ink-700 dark:text-ink-300">
              {copy.aiLabel}
            </span>
          </div>

          <h1 className="headline mt-5 text-2xl font-black tracking-tight sm:text-4xl">
            {article.title}
          </h1>
          <StoryMeta article={article} locale={locale} className="mt-4" />

          <QuickBrief locale={locale} story={first(query.story)!} signature={first(query.sig)!} />

          <div className="mt-6 flex flex-col gap-3 border-t border-ink-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-ink-800">
            <p className="text-sm text-ink-500 dark:text-ink-400">
              {dict.bySource.replace("{source}", article.source)}
            </p>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              {copy.readFull}
              <ExternalIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </article>

      <Link
        href={`/${locale}`}
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-400"
      >
        {copy.back}
        <ArrowRightIcon className="h-4 w-4" />
      </Link>
    </div>
  );
}
