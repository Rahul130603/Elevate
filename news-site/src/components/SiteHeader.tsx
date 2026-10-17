import { BrandLogo } from "./BrandLogo";
import Link from "next/link";
import { headers } from "next/headers";

import type { Dict, Locale } from "@/lib/i18n";
import { site } from "@/lib/site";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { AdminMenuButton } from "./AdminMenuButton";
import { MobileSearch } from "./MobileSearch";
import { RefreshNews } from "./RefreshNews";
import { NewsModeSwitcher } from "./NewsModeSwitcher";

export async function SiteHeader({
  locale,
  dict,
  today,
  attribution,
}: {
  locale: Locale;
  dict: Dict;
  today: string;
  attribution: string;
}) {
  const mode = (await headers()).get('x-elevate-news-mode') === 'native' ? 'native' : 'translated';

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/92 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/92">
      <div className="mx-auto max-w-7xl px-4">
        <div className="lg:hidden">
          <div className="flex items-center gap-1.5 py-2.5">
            <AdminMenuButton />
            <Link href={`/${locale}`} aria-label={site.name} className="flex min-w-0 flex-1 items-center justify-center outline-offset-4">
              <BrandLogo className="h-auto w-full max-w-[145px]" />
            </Link>
            <div className="flex shrink-0 items-center gap-1">
              <MobileSearch locale={locale} dict={dict} />
              <RefreshNews locale={locale} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pb-2.5">
            <NewsModeSwitcher mode={mode} />

            <LanguageSwitcher locale={locale} dict={dict} />
          </div>
        </div>

        <div className="hidden items-center gap-4 py-3 lg:grid lg:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-3 justify-self-start">
            <NewsModeSwitcher mode={mode} />

          </div>

          <Link href={`/${locale}`} aria-label={site.name} className="flex min-w-0 items-center justify-center outline-offset-4">
            <BrandLogo className="h-12 w-auto max-w-[220px]" />
          </Link>

          <div className="flex items-center gap-2 justify-self-end">
            <LanguageSwitcher locale={locale} dict={dict} />
            <MobileSearch locale={locale} dict={dict} />
            <RefreshNews locale={locale} />
          </div>
        </div>
      </div>
    </header>
  );
}
