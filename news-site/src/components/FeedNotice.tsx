import type { Dict } from "@/lib/i18n";

import { AlertIcon } from "./icons";

/** Shown when a feed request fails, so a stale page is never silent. */
export function FeedNotice({ dict }: { dict: Dict }) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{dict.apiError}</p>
    </div>
  );
}
