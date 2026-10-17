"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LOCALES, localeMeta, type Dict, type Locale } from "@/lib/i18n";
import { ChevronDownIcon, GlobeIcon } from "./icons";

/** Swaps the locale segment of the current URL, keeping the section intact. */
export function LanguageSwitcher({ locale, dict }: { locale: Locale; dict: Dict }) {
  const pathname = usePathname() || `/${locale}`;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const segments = pathname.split("/").filter(Boolean);
  const rest = segments.slice(1).join("/");
  const hrefFor = (code: Locale) => (rest ? `/${code}/${rest}` : `/${code}`);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const current = localeMeta[locale];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${dict.language}: ${current.english}`}
        className="flex items-center gap-1.5 rounded-full border border-ink-200 px-2.5 py-1.5 text-sm font-medium text-ink-700 transition hover:border-brand-400 hover:text-brand-700 dark:border-ink-800 dark:text-ink-200 dark:hover:border-brand-500 dark:hover:text-brand-400"
      >
        <GlobeIcon className="h-4 w-4" />
        {/* Phones show the language code, larger screens the native name. */}
        <span className="hidden sm:inline">{current.native}</span>
        <span className="text-[11px] font-bold uppercase sm:hidden">{current.code}</span>
        <ChevronDownIcon className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={dict.language}
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-xl shadow-ink-900/10 dark:border-ink-800 dark:bg-ink-900"
        >
          <p className="border-b border-ink-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:border-ink-800 dark:text-ink-400">
            {dict.language}
          </p>
          <ul className="max-h-80 overflow-y-auto py-1">
            {LOCALES.map((code) => {
              const meta = localeMeta[code];
              const isCurrent = code === locale;
              return (
                <li key={code}>
                  <Link
                    href={hrefFor(code)}
                    hrefLang={meta.intl}
                    lang={code}
                    role="option"
                    aria-selected={isCurrent}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between gap-3 px-3 py-2 text-sm transition ${
                      isCurrent
                        ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-900/25 dark:text-brand-300"
                        : "text-ink-800 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800/60"
                    }`}
                  >
                    <span className="flex flex-col">
                      <span>{meta.native}</span>
                      <span className="text-[11px] text-ink-500 dark:text-ink-400">
                        {meta.english} · {meta.script}
                      </span>
                    </span>
                    <span className="text-[11px] uppercase tracking-wide text-ink-400">{meta.code}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
