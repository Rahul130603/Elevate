"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  NAV_SECTIONS,
  categoryHref,
  isSection,
  specialityHref,
  subCategoryHref,
  type Section,
  type SectionId,
} from "@/lib/categories";
import type { Dict, Locale } from "@/lib/i18n";

import { ChevronDownIcon, LayersIcon } from "./icons";

/**
 * The site's front navigation: one button that opens a panel listing every
 * industry, each with its own sub-sections underneath (Industry → Medical →
 * Pharmacy, Physiotherapy, …). Selecting an industry shows only that field's
 * news.
 *
 * `variant="button"` is the masthead button; `variant="row"` renders the pills
 * (kept for reuse). Hover and click both open the panel, and every link is
 * prefetched as soon as the pointer shows interest.
 */
export function SiteNavigation({
  locale,
  dict,
  variant = "button",
  className = "",
}: {
  locale: Locale;
  dict: Dict;
  variant?: "button" | "row";
  className?: string;
}) {
  const pathname = usePathname() || `/${locale}`;
  const router = useRouter();
  const segments = pathname.split("/").filter(Boolean);
  const activeSection: SectionId | null = isSection(segments[1]) ? segments[1] : null;
  const activeSub = activeSection && segments[2] ? segments[2] : null;
  const activeSpeciality = activeSub && segments[3] ? segments[3] : null;
  const isHome = segments.length <= 1;

  const [open, setOpen] = useState<SectionId | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    // Small grace period so the pointer can travel into the panel.
    closeTimer.current = setTimeout(() => setOpen(null), 160);
  }, [cancelClose]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  useEffect(() => {
    setOpen(null);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const openSection = open ? NAV_SECTIONS.find((section) => section.id === open) : null;

  /** Warm the section, its industries and their sub-sections on hover/focus. */
  const prefetchSection = useCallback(
    (section: Section) => {
      router.prefetch(categoryHref(locale, section.id));
      for (const sub of section.subs) {
        router.prefetch(subCategoryHref(locale, section.id, sub.id));
        for (const speciality of sub.subs ?? []) {
          router.prefetch(specialityHref(locale, section.id, sub.id, speciality.id));
        }
      }
    },
    [locale, router],
  );

  const panel = openSection ? (
    <div
      id="section-mega-menu"
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
      className="absolute inset-x-0 top-full z-50 mx-auto mt-2 max-h-[74vh] max-w-7xl overflow-y-auto rounded-2xl border border-ink-200 bg-white p-5 shadow-xl shadow-ink-900/10 dark:border-ink-800 dark:bg-ink-900"    >
      <div className="flex items-baseline justify-between gap-4 border-b border-ink-100 pb-3 dark:border-ink-800">
        <p lang={locale} className="text-sm font-bold">
          {dict[openSection.id]}
        </p>
        <Link
          href={categoryHref(locale, openSection.id)}
          className="shrink-0 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-400"
        >
          {dict.viewAll} · {dict[openSection.id]}
        </Link>
      </div>

      <div className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {openSection.subs.map((industry) => {
          const isIndustryCurrent = activeSection === openSection.id && activeSub === industry.id;
          return (
            <div key={industry.id}>
              <Link
                href={subCategoryHref(locale, openSection.id, industry.id)}
                aria-current={isIndustryCurrent && !activeSpeciality ? "page" : undefined}
                className={`block text-sm font-bold ${
                  isIndustryCurrent ? "text-brand-700 dark:text-brand-400" : "text-ink-800 dark:text-ink-100"
                } hover:text-brand-700 dark:hover:text-brand-400`}
              >
                {industry.label}
              </Link>

              {industry.subs?.length ? (
                <ul className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {industry.subs.map((entry) => {
                    const isCurrent = isIndustryCurrent && activeSpeciality === entry.id;
                    return (
                      <li key={entry.id} className="flex items-center gap-2">
                        <Link
                          href={specialityHref(locale, openSection.id, industry.id, entry.id)}
                          aria-current={isCurrent ? "page" : undefined}
                          className={`text-[12.5px] transition ${
                            isCurrent
                              ? "font-semibold text-brand-700 dark:text-brand-400"
                              : "text-ink-500 hover:text-brand-700 dark:text-ink-400 dark:hover:text-brand-400"
                          }`}
                        >
                          {entry.label}
                        </Link>
                        <span aria-hidden="true" className="text-ink-300 dark:text-ink-600">
                          ·
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  if (variant === "row") {
    return (
      <div ref={containerRef} className={`relative hidden md:block ${className}`}>
        <nav aria-label={dict.sections}>
          <ul className="no-scrollbar flex items-center gap-1 overflow-x-auto">
            <li className="shrink-0">
              <Link href={`/${locale}`} aria-current={isHome ? "page" : undefined} className={pillClass(isHome)}>
                {dict.home}
              </Link>
            </li>

            {NAV_SECTIONS.map((section) => {
              const isOpen = open === section.id;
              const isActive = activeSection === section.id;
              return (
                <li key={section.id} className="shrink-0">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls="section-mega-menu"
                    onClick={() => setOpen(isOpen ? null : section.id)}
                    className={`${pillClass(isActive || isOpen)} gap-1.5`}
                  >
                    {dict[section.id]}
                    <ChevronDownIcon className={`h-3.5 w-3.5 transition ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        {panel}
      </div>
    );
  }

  // Masthead button: same panel, one trigger.
  //
  // The wrapper is deliberately *not* `relative`: the panel then anchors to the
  // sticky header, so it spans the page instead of the button's own width. It is
  // still the element the outside-click check tests against — without the ref
  // here, every mousedown counted as "outside", the panel unmounted mid-click and
  // no link in it could ever be followed.
  const section = NAV_SECTIONS[0];
  const isOpen = Boolean(section && open === section.id);

  return (
    <div ref={containerRef} className={className}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="section-mega-menu"
        aria-current={activeSection === section?.id ? "true" : undefined}
        onMouseEnter={() => {
          cancelClose();
          if (section) {
            setOpen(section.id);
            prefetchSection(section);
          }
        }}
        onClick={() => {
          if (!section) return;
          setOpen(isOpen ? null : section.id);
          prefetchSection(section);
        }}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
          isOpen || activeSection === section?.id
            ? "border-brand-600 bg-brand-600 text-white"
            : "border-ink-200 bg-white text-ink-800 hover:border-brand-400 hover:text-brand-700 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-100 dark:hover:border-brand-500"
        }`}
      >
        <LayersIcon className="h-4 w-4" />
        <span>{dict.industry}</span>
        <ChevronDownIcon className={`h-3.5 w-3.5 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {panel}
    </div>
  );
}

function pillClass(active: boolean): string {
  return `inline-flex items-center whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
    active
      ? "border-brand-600 bg-brand-600 text-white"
      : "border-ink-200 text-ink-700 hover:border-brand-400 hover:text-brand-700 dark:border-ink-800 dark:text-ink-200 dark:hover:border-brand-500 dark:hover:text-brand-300"
  }`;
}
