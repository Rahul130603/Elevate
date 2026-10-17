import { BrandLogo } from "./BrandLogo";
import Link from "next/link";
import { headers } from "next/headers";

import { NAV_SECTIONS, getSection, subCategoryHref, categoryHref } from "@/lib/categories";
import { categoryLabel, LOCALES, localeMeta, type Dict, type Locale } from "@/lib/i18n";
import { site } from "@/lib/site";

/** Industries fill the footer's browse column, since the nav is industry-only. */


export async function SiteFooter({
  locale,
  dict,
  attribution,
}: {
  locale: Locale;
  dict: Dict;
  attribution: string;
}) {
  const year = new Date().getFullYear();

  const industryId = (await headers()).get("x-elevate-industry");
  const industrySubs = getSection("industry").subs.filter(item => item.id === industryId);
  return (
    <footer className="mt-16 border-t border-ink-200 bg-ink-50 dark:border-ink-800 dark:bg-ink-900/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link href={`/${locale}`} aria-label={site.name} className="inline-block outline-offset-4">
            <BrandLogo className="h-10 w-auto" />
          </Link>
          <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">{dict.tagline}</p>
          <p className="mt-3 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
            {dict.footerDisclaimer}
          </p>
        </div>

        <nav aria-label="Sections">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            {dict.allCategories}
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
            {NAV_SECTIONS.map((section) => (
              <li key={section.id}>
                <Link
                  href={categoryHref(locale, section.id)}
                  className="text-ink-700 transition hover:text-brand-700 dark:text-ink-300 dark:hover:text-brand-400"
                >
                  {categoryLabel(dict, section.id)}
                </Link>
              </li>
            ))}
            {industrySubs.slice(0, 12).map((sub) => (
              <li key={sub.id}>
                <Link
                  href={subCategoryHref(locale, "industry", sub.id)}
                  className="text-ink-700 transition hover:text-brand-700 dark:text-ink-300 dark:hover:text-brand-400"
                >
                  {sub.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={dict.exploreLanguages}>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            {dict.exploreLanguages}
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {LOCALES.map((code) => (
              <li key={code}>
                <Link
                  href={`/${code}`}
                  hrefLang={localeMeta[code].intl}
                  lang={code}
                  className={`transition hover:text-brand-700 dark:hover:text-brand-400 ${
                    code === locale
                      ? "font-semibold text-brand-700 dark:text-brand-400"
                      : "text-ink-700 dark:text-ink-300"
                  }`}
                >
                  {localeMeta[code].native}
                  <span className="ml-1.5 text-xs text-ink-400">({localeMeta[code].english})</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            {dict.latest}
          </h2>
          <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">{dict.footerNote}</p>
          <p className="mt-3 text-xs text-ink-500 dark:text-ink-400">
            {dict.fromSources}: {attribution}
          </p>
          <Link
            href={`/${locale}/rss.xml`}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400"
          >
            RSS
          </Link>
        </div>
      </div>

      <div className="border-t border-ink-200 dark:border-ink-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between dark:text-ink-400">
          <p>
            © {year} <BrandLogo className="inline-block h-5 w-auto align-middle" /> · {dict.rights}
          </p>
          <p>{dict.edition}</p>
        </div>
      </div>
    </footer>
  );
}
