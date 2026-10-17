import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { NavigationProgress } from "@/components/NavigationProgress";
import { todayLabel } from "@/lib/format";
import { getDict, isLocale, localeMeta } from "@/lib/i18n";
import { providerAttribution } from "@/lib/news";
import { languageAlternates } from "@/lib/seo";
import { site, siteUrl } from "@/lib/site";

import "../globals.css";

/** Feeds are refetched every few minutes; pages are regenerated with them. */
export const revalidate = 300;

export const viewport: Viewport = { colorScheme: "light", themeColor: "#ffffff" };


export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  const dict = getDict(lang);

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${site.name} — ${dict.tagline}`,
      template: `%s · ${site.name}`,
    },
    description: dict.tagline,
    applicationName: site.name,
    alternates: {
      canonical: `/${lang}`,
      languages: languageAlternates((locale) => `/${locale}`),
    },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: localeMeta[lang].intl.replace("-", "_"),
      title: `${site.name} — ${dict.tagline}`,
      description: dict.tagline,
      url: `/${lang}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${site.name} — ${dict.tagline}`,
      description: dict.tagline,
      site: site.twitter,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    icons: {
      icon: [
        { url: "/admin-news/elevate-logo.png", type: "image/png" },
        { url: "/admin-news/elevate-logo.png", sizes: "any" },
      ],
      apple: "/admin-news/elevate-logo.png",
    },
    formatDetection: { telephone: false, address: false, email: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDict(lang);
  const meta = localeMeta[lang];

  return (
    <html lang={lang} dir={meta.dir} data-scroll-behavior="smooth">
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          {dict.skipToContent}
        </a>

        <NavigationProgress />

        <SiteHeader
          locale={lang}
          dict={dict}
          today={todayLabel(lang)}
          attribution={providerAttribution}
        />

        <main id="main" className="flex-1">
          {children}
        </main>

        <SiteFooter locale={lang} dict={dict} attribution={providerAttribution} />
      </body>
    </html>
  );
}
