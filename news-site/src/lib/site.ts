/**
 * Global site configuration. Rename the site here and it changes everywhere.
 */
const rawUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

export const siteUrl = rawUrl.replace(/\/+$/, "");

export const site = {
  /** Display name used in the header, metadata, sitemap and RSS. */
  name: "Elevate",
  /** Short label for tight spaces (mobile header). */
  nameShort: "Elevate",
  /** Used in JSON-LD publisher blocks. */
  publisher: "Elevate",
  /** Shown in the footer. */
  contactEmail: "",
  /** Social handle for metadata (optional). */
  twitter: "",
  url: siteUrl,
} as const;

/** Google News topics are per country, so the whole site is one "edition". */
export const newsCountry = (process.env.NEWS_COUNTRY || "IN").toUpperCase();

/** How long an upstream feed response is reused before it is refetched. */
const parsedRevalidate = Number(process.env.NEWS_REVALIDATE_SECONDS ?? "300");
export const feedRevalidateSeconds =
  Number.isFinite(parsedRevalidate) && parsedRevalidate > 0 ? parsedRevalidate : 300;
