import { NextResponse } from "next/server";

import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { getNews } from "@/lib/news";
import { storyHref } from "@/lib/story-url";

/**
 * The notification feed for the phone app (and the in-page "new stories" pill).
 *
 * GET /api/alerts?lang=en&since=<ISO date|epoch ms>&limit=5
 *
 * `since` is what makes this useful: the caller sends the moment it last looked,
 * and only stories published after it come back, so the app can decide whether a
 * notification is worth showing at all.
 *
 * The pages themselves are statically rendered; this route is deliberately
 * dynamic, because a cached answer to "anything new?" is worthless.
 *
 * Every item carries `path`: a *signed* link to our own story page. Signed, not
 * bare, because an article id is derived from the provider's URL — switch a keyed
 * provider on or off (or let its quota run out) and the same story gets a new id,
 * so a link built from today's id would 404 when the notification is tapped
 * tomorrow. The signature carries the story inside the link instead.
 */
export const dynamic = "force-dynamic";

function parseSince(value: string | null): number | null {
  if (!value) return null;
  const numeric = Number(value);
  const parsed = Number.isFinite(numeric) ? numeric : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const requested = params.get("lang") ?? DEFAULT_LOCALE;
  const locale: Locale = isLocale(requested) ? requested : DEFAULT_LOCALE;
  const since = parseSince(params.get("since"));
  const limit = Math.min(Math.max(Number(params.get("limit") ?? 5) || 5, 1), 20);

  const result = await getNews({ locale, category: "top", limit: 20, withImages: false });

  const stories = result.articles.map((article) => ({
    id: article.id,
    title: article.title,
    source: article.source,
    publishedAt: article.publishedAt,
    path: storyHref(locale, article),
  }));

  const items =
    since === null
      ? stories
      : stories.filter((story) => story.publishedAt && Date.parse(story.publishedAt) > since);

  return NextResponse.json(
    {
      locale,
      ok: result.ok,
      fetchedAt: result.fetchedAt,
      latest: stories[0]?.publishedAt ?? null,
      total: stories.length,
      count: items.length,
      items: items.slice(0, limit),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
