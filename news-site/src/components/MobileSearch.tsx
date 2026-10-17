"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { NAV_SECTIONS, categoryHref } from "@/lib/categories";
import type { Dict, Locale } from "@/lib/i18n";

import { CloseIcon, SearchIcon } from "./icons";

/**
 * Phone search: a button in the masthead that opens a full-width sheet with a
 * plain GET form, so results work with or without JavaScript and every search has
 * a shareable URL (`/en/search?q=…`).
 */
export function MobileSearch({ locale, dict }: { locale: Locale; dict: Dict }) {
  const pathname = usePathname() || `/${locale}`;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 80);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      clearTimeout(focusTimer);
    };
  }, [open]);

  return (
    <div className="contents">
      <button
        type="button"
        aria-label={dict.search}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-200 text-ink-700 transition hover:border-brand-400 hover:text-brand-700 dark:border-ink-800 dark:text-ink-200"
      >
        <SearchIcon className="h-4.5 w-4.5" />
      </button>

      {mounted && open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={dict.search}
              className="fixed inset-0 z-[70] bg-white dark:bg-ink-950"
            >
              <form action={`/admin-news/${locale}/search`} method="get" role="search" className="flex items-center gap-2 border-b border-ink-100 p-3 dark:border-ink-800">
                <label htmlFor={`mobile-q-${locale}`} className="sr-only">
                  {dict.search}
                </label>
                <input
                  ref={inputRef}
                  id={`mobile-q-${locale}`}
                  name="q"
                  type="search"
                  autoComplete="off"
                  placeholder={dict.searchPlaceholder}
                  className="min-w-0 flex-1 rounded-full border border-ink-200 bg-ink-50 px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-800 dark:bg-ink-900 dark:text-ink-50"
                />
                <button
                  type="submit"
                  className="rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  {dict.search}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={dict.close}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 dark:hover:bg-ink-800"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </form>

              <div className="p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400 dark:text-ink-500">
                  {dict.sections}
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {NAV_SECTIONS.map((section) => (
                    <li key={section.id}>
                      <Link
                        href={categoryHref(locale, section.id)}
                        onClick={() => setOpen(false)}
                        className="inline-flex rounded-full border border-ink-200 px-3 py-1.5 text-sm text-ink-700 transition hover:border-brand-400 hover:text-brand-700 dark:border-ink-800 dark:text-ink-200"
                      >
                        {dict[section.id]}
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-sm text-ink-500 dark:text-ink-400">{dict.searchHint}</p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
