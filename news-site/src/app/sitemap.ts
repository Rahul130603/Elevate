import type { MetadataRoute } from "next";

import { SECTIONS } from "@/lib/categories";
import { LOCALES } from "@/lib/i18n";
import { absoluteUrl, languageAlternates } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    entries.push({
      url: absoluteUrl(`/${locale}`),
      lastModified,
      changeFrequency: "hourly",
      priority: 1,
      alternates: { languages: languageAlternates((code) => `/${code}`) },
    });


    for (const section of SECTIONS) {
      entries.push({
        url: absoluteUrl(`/${locale}/${section.id}`),
        lastModified,
        changeFrequency: "hourly",
        priority: 0.8,
        alternates: { languages: languageAlternates((code) => `/${code}/${section.id}`) },
      });

      for (const sub of section.subs) {
        entries.push({
          url: absoluteUrl(`/${locale}/${section.id}/${sub.id}`),
          lastModified,
          changeFrequency: "daily",
          priority: 0.6,
          alternates: {
            languages: languageAlternates((code) => `/${code}/${section.id}/${sub.id}`),
          },
        });

        // Third level: an industry's own sub-sections.
        for (const speciality of sub.subs ?? []) {
          entries.push({
            url: absoluteUrl(`/${locale}/${section.id}/${sub.id}/${speciality.id}`),
            lastModified,
            changeFrequency: "daily",
            priority: 0.5,
            alternates: {
              languages: languageAlternates(
                (code) => `/${code}/${section.id}/${sub.id}/${speciality.id}`,
              ),
            },
          });
        }
      }
    }
  }

  return entries;
}
