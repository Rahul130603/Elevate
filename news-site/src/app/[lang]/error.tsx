"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

import { AlertIcon } from "@/components/icons";
import { DEFAULT_LOCALE, getDict, toLocale } from "@/lib/i18n";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ lang?: string | string[] }>();
  const raw = Array.isArray(params?.lang) ? params.lang[0] : params?.lang;
  const locale = toLocale(raw ?? DEFAULT_LOCALE);
  const dict = getDict(locale);

  useEffect(() => {
    console.error("[page] render error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
        <AlertIcon className="h-6 w-6" />
      </span>
      <h1 className="headline mt-5 text-2xl font-black tracking-tight">{dict.apiErrorShort}</h1>
      <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">{dict.apiError}</p>

      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        {dict.latest}
      </button>
    </div>
  );
}
