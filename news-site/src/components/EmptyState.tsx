import Link from "next/link";
import Script from "next/script";

import { CATEGORIES, categoryHref } from "@/lib/categories";
import { categoryLabel, type Dict, type Locale } from "@/lib/i18n";

export function EmptyState({
  title,
  body,
  locale,
  dict,
  suggestions = true,
}: {
  title: string;
  body: string;
  locale: Locale;
  dict: Dict;
  suggestions?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-300 p-8 text-center dark:border-ink-700">
      <p className="text-base font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-500 dark:text-ink-400">{body}</p>

      {suggestions ? (
        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {CATEGORIES.slice(0, 6).map((category) => (
            <li key={category}>
              <Link
                href={categoryHref(locale, category)}
                className="inline-flex rounded-full border border-ink-200 px-3 py-1.5 text-sm text-ink-700 transition hover:border-brand-400 hover:text-brand-700 dark:border-ink-800 dark:text-ink-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
              >
                {categoryLabel(dict, category)}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Structured data. Next's `Script` component is used instead of a bare <script>
 * because React warns ("Encountered a script tag while rendering React
 * component") whenever the server tree is re-rendered on the client during soft
 * navigation — which is every link click in dev.
 */
export function JsonLd({ data, id = "structured-data" }: { data: unknown; id?: string }) {
  return (
    <Script
      id={id}
      type="application/ld+json"
      // `<` is escaped so a `</script>` inside the data cannot break out.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
