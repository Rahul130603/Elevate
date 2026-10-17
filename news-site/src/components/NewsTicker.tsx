import Link from "next/link";

import type { Article } from "@/lib/news";
import type { Dict, Locale } from "@/lib/i18n";
import { storyHref } from "@/lib/story-url";

/**
 * Scrolling headline strip. The list is rendered twice and translated by -50%
 * so the loop is seamless; it pauses on hover and respects reduced motion.
 */
export function NewsTicker({
  articles,
  locale,
  dict,
}: {
  articles: Article[];
  locale: Locale;
  dict: Dict;
}) {
  if (articles.length === 0) return null;

  const strip = articles.slice(0, 10);

  return (
    <div className="border-y border-brand-700/40 bg-brand-600 text-white">
      <div className="mx-auto flex max-w-7xl items-stretch">
        <span className="flex shrink-0 items-center gap-2 bg-brand-700 px-3 text-[11px] font-black uppercase tracking-widest sm:px-4">
          <span className="h-1.5 w-1.5 animate-blip rounded-full bg-white motion-reduce:animate-none" />
          {dict.live}
        </span>

        <div className="ticker-mask relative flex-1 overflow-hidden">
          <div className="group flex w-max animate-ticker items-center gap-8 py-2 pl-4 hover:[animation-play-state:paused] motion-reduce:animate-none">
            {[...strip, ...strip].map((article, index) => (
              <Link
                key={`${article.id}-${index}`}
                href={storyHref(locale, article)}
                className="group/item flex shrink-0 items-center gap-2 text-sm hover:underline"
                aria-hidden={index >= strip.length ? true : undefined}
                tabIndex={index >= strip.length ? -1 : undefined}
              >
                <span className="h-1 w-1 shrink-0 rounded-full bg-white/60" aria-hidden="true" />
                <span lang={locale} className="whitespace-nowrap font-medium">
                  {article.title}
                </span>
                <span className="whitespace-nowrap text-xs text-white/65">{article.source}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
