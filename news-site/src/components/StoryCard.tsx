import Link from "next/link";

import type { Article } from "@/lib/news";
import { categoryLabel, type Dict, type Locale } from "@/lib/i18n";
import { formatRelative } from "@/lib/format";
import { storyHref } from "@/lib/story-url";

import { StoryThumb } from "./StoryThumb";

export function StoryMeta({
  article,
  locale,
  className = "",
  tone = "muted",
}: {
  article: Article;
  locale: Locale;
  className?: string;
  tone?: "muted" | "inverted";
}) {
  const muted = tone === "inverted" ? "text-white/75" : "text-ink-500 dark:text-ink-400";
  const strong = tone === "inverted" ? "text-white" : "text-ink-700 dark:text-ink-200";

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${muted} ${className}`}>
      <span className={`font-semibold ${strong}`}>{article.source}</span>
      {article.publishedAt ? (
        <>
          <span aria-hidden="true">·</span>
          <time dateTime={article.publishedAt}>{formatRelative(article.publishedAt, locale)}</time>
        </>
      ) : null}
    </div>
  );
}

/** Standard grid card: artwork, headline, publisher + relative time. */
export function StoryCard({
  article,
  dict,
  locale,
  showCategory = false,
  priority = false,
}: {
  article: Article;
  dict: Dict;
  locale: Locale;
  showCategory?: boolean;
  priority?: boolean;
}) {
  return (
    <article className="group h-full">
      <Link
        href={storyHref(locale, article)}
        className="flex h-full flex-col rounded-xl outline-offset-4"
      >
        <StoryThumb
          seed={article.id}
          source={article.source}
          category={article.category}
          locale={locale}
          image={article.image}
          label={showCategory ? categoryLabel(dict, article.category) : undefined}
          className="aspect-[16/10] w-full rounded-xl ring-1 ring-black/5 transition duration-300 group-hover:brightness-[1.06] dark:ring-white/10"
        />
        <h3
          className={`headline mt-3 font-semibold group-hover:text-brand-700 dark:group-hover:text-brand-400 ${
            priority ? "text-lg sm:text-xl" : "text-[0.98rem] sm:text-base"
          }`}
        >
          {article.title}
        </h3>
        <StoryMeta article={article} locale={locale} className="mt-2" />
      </Link>
    </article>
  );
}

/** Big lead story with the headline laid over the artwork. */
export function LeadStory({
  article,
  dict,
  locale,
  liveLabel,
}: {
  article: Article;
  dict: Dict;
  locale: Locale;
  liveLabel?: string;
}) {
  return (
    <article className="group">
      <Link
        href={storyHref(locale, article)}
        className="relative block overflow-hidden rounded-2xl ring-1 ring-black/5 outline-offset-4 dark:ring-white/10"
      >
        <StoryThumb
          seed={article.id}
          source={article.source}
          category={article.category}
          size="hero"
          locale={locale}
          image={article.image}
          priority
          className="aspect-[16/11] w-full sm:aspect-[16/9]"
        />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 lg:p-7">
          <div className="mb-3 flex items-center gap-2">
            <span
              lang={locale}
              className="rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white"
            >
              {categoryLabel(dict, article.category)}
            </span>
            {liveLabel ? (
              <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                <span className="h-1.5 w-1.5 animate-blip rounded-full bg-brand-400 motion-reduce:animate-none" />
                {liveLabel}
              </span>
            ) : null}
          </div>
          <h2 className="headline text-xl font-bold text-white drop-shadow-sm sm:text-2xl lg:text-[2rem]">
            {article.title}
          </h2>
          <StoryMeta article={article} locale={locale} tone="inverted" className="mt-3" />
        </div>
      </Link>
    </article>
  );
}

/** Compact numbered row, used for trending lists. */
export function StoryRow({
  article,
  locale,
  rank,
  showThumb = true,
}: {
  article: Article;
  locale: Locale;
  rank?: number;
  showThumb?: boolean;
}) {
  return (
    <article className="group flex gap-3">
      {typeof rank === "number" ? (
        <span
          className="w-7 shrink-0 pt-0.5 text-xl font-black leading-none text-ink-300 tabular-nums dark:text-ink-700"
          aria-hidden="true"
        >
          {rank}
        </span>
      ) : null}

      {showThumb ? (
        <StoryThumb
          seed={article.id}
          source={article.source}
          category={article.category}
          size="compact"
          image={article.image}
          className="h-16 w-20 shrink-0 rounded-lg ring-1 ring-black/5 dark:ring-white/10"
        />
      ) : null}

      <div className="min-w-0">
        <h3 className="headline text-sm font-semibold leading-snug group-hover:text-brand-700 dark:group-hover:text-brand-400">
          <Link href={storyHref(locale, article)}>
            {article.title}
          </Link>
        </h3>
        <StoryMeta article={article} locale={locale} className="mt-1" />
      </div>
    </article>
  );
}
