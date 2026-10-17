"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { DEFAULT_LOCALE, getDict, toLocale } from "@/lib/i18n";

export default function LocaleNotFound() {
  const params = useParams<{ lang?: string | string[] }>();
  const raw = Array.isArray(params?.lang) ? params.lang[0] : params?.lang;
  const locale = toLocale(raw ?? DEFAULT_LOCALE);
  const dict = getDict(locale);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <p className="text-6xl font-black tracking-tighter text-brand-600 dark:text-brand-500">404</p>
      <h1 className="headline mt-4 text-2xl font-black tracking-tight">{dict.notFoundTitle}</h1>
      <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">{dict.notFoundBody}</p>
      <Link
        href={`/${locale}`}
        className="mt-6 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        {dict.goHome}
      </Link>
    </div>
  );
}
