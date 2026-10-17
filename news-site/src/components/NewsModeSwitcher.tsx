"use client";

export function NewsModeSwitcher({ mode }: { mode: string }) {
  function select(value: string) {
    document.cookie = `elevate_news_mode=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.location.reload();
  }
  return <div className="flex flex-wrap items-center gap-2" aria-label="News mode">
    {[["translated", "Translated News"], ["native", "Local Language News"]].map(([value, label]) =>
      <button key={value} type="button" aria-pressed={mode === value} onClick={() => select(value)}
        title={value === "native" ? "Reports published in your selected language" : "News translated into your selected language"}
        className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold transition sm:text-sm ${mode === value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 bg-white text-ink-700 hover:border-brand-400"}`}>{label}</button>)}
  </div>;
}
