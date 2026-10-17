"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { NAV_SECTIONS, categoryHref, isSection, specialityHref, subCategoryHref, type Section, type SectionId } from "@/lib/categories";
import type { Dict, Locale } from "@/lib/i18n";

import { ChevronDownIcon, CloseIcon, MenuIcon } from "./icons";

/**
 * Phone navigation: a button that slides a drawer in from the left, the way an
 * app does it. Every section expands to its sub-categories, and the panel closes
 * on navigation, on Escape, on the backdrop, or with the close button.
 */
export function MobileMenu({ locale, dict }: { locale: Locale; dict: Dict }) {
  const pathname = usePathname() || `/${locale}`;
  const segments = pathname.split("/").filter(Boolean);
  const activeSection: SectionId | null = isSection(segments[1]) ? segments[1] : null;
  const activeSub = activeSection && segments[2] ? segments[2] : null;
  const activeSpeciality = activeSub && segments[3] ? segments[3] : null;
  const isHome = segments.length <= 1;

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<SectionId | null>(activeSection);
  const [expandedSub, setExpandedSub] = useState<string | null>(activeSub);
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /**
   * Phones have no hover, so the pages are warmed when the drawer opens and when
   * a section is expanded — by the time the reader taps a sub-category it is
   * already in the router cache and the switch is instant.
   */
  const warm = useCallback(
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
  // The drawer is portalled to <body>: the header has a backdrop blur, which
  // would otherwise become the containing block for `position: fixed` and clip
  // the panel to the header's height.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    // Warm whichever section is open in the drawer.
    const section = NAV_SECTIONS.find((entry) => entry.id === (expanded ?? activeSection));
    if (section) warm(section);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    // Move focus into the panel so a keyboard or screen reader starts there.
    const focusTimer = setTimeout(() => closeRef.current?.focus(), 60);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      clearTimeout(focusTimer);
    };
  }, [open]);

  return (
    <div className="contents md:hidden">
      <button
        type="button"
        ref={triggerRef}
        aria-expanded={open}
        aria-controls="mobile-drawer"
        aria-label={dict.menu}
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-200 text-ink-700 transition hover:border-brand-400 hover:text-brand-700 dark:border-ink-800 dark:text-ink-200"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      {mounted
        ? createPortal(
            <>
              {/* Backdrop */}
              <div
                aria-hidden="true"
                onClick={() => setOpen(false)}
                className={`fixed inset-0 z-50 bg-ink-950/50 backdrop-blur-[1px] transition-opacity duration-200 md:hidden ${
                  open ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              />

              {/* Drawer */}
              <div
                id="mobile-drawer"
                role="dialog"
                aria-modal="true"
                aria-label={dict.sections}
                className={`fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-200 ease-out md:hidden dark:bg-ink-900 ${
                  open ? "translate-x-0" : "-translate-x-full"
                }`}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
                  <p className="text-[11px] font-black uppercase tracking-widest text-ink-500 dark:text-ink-400">
                    {dict.sections}
                  </p>
                  <button
                    type="button"
                    ref={closeRef}
                    onClick={() => {
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                    aria-label={dict.close}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-800 dark:hover:bg-ink-800 dark:hover:text-ink-100"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>

        <nav aria-label={dict.sections} className="flex-1 overflow-y-auto p-3">
          <Link
            href={`/${locale}`}
            aria-current={isHome ? "page" : undefined}
            className={`block rounded-lg px-3 py-2.5 text-sm font-semibold ${
              isHome ? "bg-brand-50 text-brand-700 dark:bg-brand-900/25 dark:text-brand-300" : "text-ink-800 dark:text-ink-100"
            }`}
          >
            {dict.home}
          </Link>

          <ul className="mt-2 space-y-1.5">
            {NAV_SECTIONS.map((section) => {
              const isExpanded = expanded === section.id;
              const isActive = activeSection === section.id;
              return (
                <li key={section.id} className="overflow-hidden rounded-xl border border-ink-200 dark:border-ink-800">
                  <div className="flex items-center">
                    <Link
                      href={categoryHref(locale, section.id)}
                      aria-current={isActive && !activeSub ? "page" : undefined}
                      className={`flex-1 px-3 py-3 text-sm font-semibold ${
                        isActive ? "text-brand-700 dark:text-brand-400" : "text-ink-800 dark:text-ink-100"
                      }`}
                    >
                      {dict[section.id]}
                    </Link>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`drawer-submenu-${section.id}`}
                      aria-label={dict[section.id]}
                      onClick={() => {
                        const next = isExpanded ? null : section.id;
                        setExpanded(next);
                        if (next) warm(section);
                      }}
                      className="px-3 py-3 text-ink-500 transition hover:text-brand-700 dark:text-ink-400"
                    >
                      <ChevronDownIcon className={`h-4 w-4 transition ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  {isExpanded ? (
                    <ul
                      id={`drawer-submenu-${section.id}`}
                      className="border-t border-ink-100 bg-ink-50/60 px-2 py-2 dark:border-ink-800 dark:bg-ink-950/40"
                    >
                      {section.subs.map((sub) => {
                        const isCurrent = isActive && activeSub === sub.id;
                        const hasChildren = Boolean(sub.subs?.length);
                        const subOpen = expandedSub === sub.id;

                        return (
                          <li key={sub.id} className="py-0.5">
                            <div className="flex items-center">
                              <Link
                                href={subCategoryHref(locale, section.id, sub.id)}
                                aria-current={isCurrent && !activeSpeciality ? "page" : undefined}
                                className={`flex-1 rounded-md px-3 py-2 text-sm ${
                                  isCurrent
                                    ? "font-semibold text-brand-700 dark:text-brand-400"
                                    : "text-ink-600 hover:text-brand-700 dark:text-ink-300 dark:hover:text-brand-400"
                                }`}
                              >
                                {sub.label}
                              </Link>
                              {hasChildren ? (
                                <button
                                  type="button"
                                  aria-expanded={subOpen}
                                  aria-controls={`drawer-speciality-${sub.id}`}
                                  aria-label={sub.label}
                                  onClick={() => setExpandedSub(subOpen ? null : sub.id)}
                                  className="px-3 py-2 text-ink-500 transition hover:text-brand-700 dark:text-ink-400"
                                >
                                  <ChevronDownIcon className={`h-3.5 w-3.5 transition ${subOpen ? "rotate-180" : ""}`} />
                                </button>
                              ) : null}
                            </div>

                            {hasChildren && subOpen ? (
                              <ul
                                id={`drawer-speciality-${sub.id}`}
                                className="mb-1 ml-3 border-l border-ink-200 pl-3 dark:border-ink-700"
                              >
                                {sub.subs?.map((speciality) => {
                                  const isSpecialityCurrent = isCurrent && activeSpeciality === speciality.id;
                                  return (
                                    <li key={speciality.id}>
                                      <Link
                                        href={specialityHref(locale, section.id, sub.id, speciality.id)}
                                        aria-current={isSpecialityCurrent ? "page" : undefined}
                                        className={`block rounded-md px-2 py-1.5 text-[13px] ${
                                          isSpecialityCurrent
                                            ? "font-semibold text-brand-700 dark:text-brand-400"
                                            : "text-ink-500 hover:text-brand-700 dark:text-ink-400 dark:hover:text-brand-400"
                                        }`}
                                      >
                                        {speciality.label}
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
