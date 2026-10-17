/**
 * Search-only skeleton. It deliberately does NOT sit at the `[lang]` segment:
 * a Suspense boundary above a page forces the response to stream, and once the
 * shell is flushed `notFound()` / `redirect()` can no longer set the HTTP status
 * (invalid sections would answer 200 instead of 404). Search never 404s, so the
 * boundary is safe here.
 */
export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="h-8 w-56 animate-pulse rounded bg-ink-100 dark:bg-ink-900" />
      <div className="mt-4 h-10 w-full max-w-2xl animate-pulse rounded-full bg-ink-100 dark:bg-ink-900" />

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <div className="aspect-[16/10] animate-pulse rounded-xl bg-ink-100 dark:bg-ink-900" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-ink-100 dark:bg-ink-900" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-ink-100 dark:bg-ink-900" />
          </div>
        ))}
      </div>
    </div>
  );
}
