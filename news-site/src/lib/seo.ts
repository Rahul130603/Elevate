import { LOCALES, localeMeta, type Locale } from "./i18n";
import { siteUrl } from "./site";

/** hreflang map for `alternates.languages`, including x-default. */
export function languageAlternates(pathFor: (locale: Locale) => string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[localeMeta[locale].intl] = pathFor(locale);
  }
  languages["x-default"] = pathFor("en");
  return languages;
}

export function absoluteUrl(path: string): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
