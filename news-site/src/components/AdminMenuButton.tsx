"use client";
export function AdminMenuButton() {
  return <button type="button" aria-label="Open navigation menu" onClick={() => window.parent.postMessage({ type: "elevate:open-admin-menu" }, window.location.origin)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-200 dark:border-ink-800">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
  </button>;
}
