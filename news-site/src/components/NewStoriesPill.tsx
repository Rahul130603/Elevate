"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { Dict, Locale } from "@/lib/i18n";

/**
 * "N new stories" pill for the front page.
 *
 * It polls our own /api/alerts once a minute and compares the answer with the last
 * time this reader looked, so a reader who leaves the page open still learns that
 * something arrived.
 *
 * This is deliberately *not* a service-worker push: the site is served over plain
 * HTTP on the local network, and browsers only expose service workers and the
 * Notification API on a secure origin (HTTPS or localhost). On a phone opening
 * `http://192.168.x.x:3000` there is no service worker to push through — the
 * Android app's own notifications are what cover that case.
 */
export function NewStoriesPill({ locale, dict }: { locale: Locale; dict: Dict }) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const storageKey = `meeetly:seen:${locale}`;

  useEffect(() => {
    // First visit: remember now, so the reader is not told about the stories that
    // were already on the page when they arrived.
    if (!window.localStorage.getItem(storageKey)) {
      window.localStorage.setItem(storageKey, new Date().toISOString());
      return;
    }

    let cancelled = false;

    const check = async () => {
      try {
        const since = window.localStorage.getItem(storageKey) ?? "";
        const response = await fetch(
          `/admin-news/api/alerts?lang=${locale}&since=${encodeURIComponent(since)}&limit=9`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const data = (await response.json()) as { count?: number };
        if (!cancelled && typeof data.count === "number") setCount(data.count);
      } catch {
        // Being offline is a normal state for this site; stay quiet.
      }
    };

    void check();
    const timer = window.setInterval(check, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [locale, storageKey]);

  const refresh = useCallback(() => {
    window.localStorage.setItem(storageKey, new Date().toISOString());
    setCount(0);
    router.refresh();
  }, [router, storageKey]);

  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={refresh}
      className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-brand-900/25 transition hover:bg-brand-700"
    >
      ↑ {dict.newStories.replace("{count}", String(count))}
    </button>
  );
}
