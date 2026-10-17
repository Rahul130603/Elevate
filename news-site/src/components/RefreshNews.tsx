"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
export function RefreshNews({ locale }: { locale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const running = useRef(false);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState("Refresh news");
  const refresh = useCallback(async () => {
    if (running.current) return;
    running.current = true; setLoading(true); setStatus("Checking latest news…");
    try {
      const response = await fetch("/admin-news/api/news-refresh", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ locale }), signal: AbortSignal.timeout(30000) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error();
      setStatus(`News updated at ${new Date(result.fetchedAt).toLocaleTimeString()}`);
      startTransition(() => router.refresh());
    } catch { setStatus("News could not refresh. Please try again."); }
    finally { running.current = false; setLoading(false); }
  }, [locale, router]);
  useEffect(() => {
    if (!pathname?.includes("/industry/") && !pathname?.endsWith("/search")) return;
    const check = () => { if (document.visibilityState === "visible" && buttonRef.current?.getClientRects().length) void refresh(); };
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, [pathname, refresh]);
  return <>
    <button ref={buttonRef} type="button" onClick={() => void refresh()} disabled={loading || pending} aria-label="Refresh news" aria-busy={loading || pending} title={status} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-200 text-ink-700 transition hover:border-brand-400 hover:text-brand-700 disabled:opacity-60 dark:border-ink-800 dark:text-ink-300 dark:hover:text-brand-400">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={loading || pending ? "animate-spin motion-reduce:animate-none" : ""}>
        <path d="M3 11a9 9 0 0 1 15.4-6.4L21 7M21 3v4h-4" />
        <path d="M21 13a9 9 0 0 1-15.4 6.4L3 17M3 21v-4h4" />
      </svg>
    </button>
    <span role="status" aria-live="polite" className="sr-only">{status}</span>
  </>;
}
