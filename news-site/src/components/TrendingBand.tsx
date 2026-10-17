import type { Dict, Locale } from "@/lib/i18n";
import type { Article } from "@/lib/news";

import { SectionHeading } from "./SectionHeading";
import { StoryRow } from "./StoryCard";
import { TrendIcon } from "./icons";

/**
 * "Trending now" as a full-width band.
 *
 * The right-hand rail it used to live in is gone, so the rest of the page can
 * use the whole width and there is no empty column left behind.
 */
export function TrendingBand({
  articles,
  locale,
  dict,
  title,
  className = "",
}: {
  articles: Article[];
  locale: Locale;
  dict: Dict;
  title?: string;
  className?: string;
}) {
  if (articles.length === 0) return null;

  return (
    <section
      aria-labelledby="trending-heading"
      className={`rounded-2xl border border-ink-200 p-4 sm:p-5 dark:border-ink-800 ${className}`}
    >
      <SectionHeading
        id="trending-heading"
        title={title ?? dict.trending}
        icon={<TrendIcon className="h-5 w-5 text-brand-600" />}
      />
      <ol className="grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.slice(0, 6).map((article, index) => (
          <li key={article.id}>
            <StoryRow article={article} locale={locale} rank={index + 1} showThumb={false} />
          </li>
        ))}
      </ol>
    </section>
  );
}
