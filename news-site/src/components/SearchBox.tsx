import { SearchIcon } from "./icons";

/** Plain GET form: search works with JS disabled and keeps URLs shareable. */
export function SearchBox({
  locale,
  dict,
  defaultValue = "",
  autoFocus = false,
  className = "",
}: {
  locale: string;
  dict: { search: string; searchPlaceholder: string };
  defaultValue?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <form
      action={`/admin-news/${locale}/search`}
      method="get"
      role="search"
      className={`relative ${className}`}
      data-testid="search-form"
    >
      <label htmlFor={`q-${locale}`} className="sr-only">
        {dict.search}
      </label>
      <input
        id={`q-${locale}`}
        type="search"
        name="q"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder={dict.searchPlaceholder}
        autoComplete="off"
        className="w-full rounded-full border border-ink-200 bg-ink-50 py-2 pl-4 pr-11 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-ink-800 dark:bg-ink-900 dark:text-ink-50 dark:placeholder:text-ink-500 dark:focus:bg-ink-900"
      />
      <button
        type="submit"
        aria-label={dict.search}
        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-500 transition hover:bg-brand-600 hover:text-white dark:text-ink-400"
      >
        <SearchIcon className="h-4 w-4" />
      </button>
    </form>
  );
}
