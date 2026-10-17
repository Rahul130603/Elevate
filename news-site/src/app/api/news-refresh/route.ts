import { isLocale } from "@/lib/i18n";
import { clearIndustryNewsCache, getNews } from "@/lib/news";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  if (!isLocale(body?.locale)) return Response.json({ error: "Invalid language" }, { status: 400 });
  const industry = request.headers.get("x-elevate-industry") || "";
  clearIndustryNewsCache(industry, body.locale);
  const result = await getNews({ locale: body.locale, limit: 30, withImages: false });
  return Response.json({ ok: result.ok, stale: result.stale, fetchedAt: result.fetchedAt, latest: result.articles[0]?.publishedAt || null, count: result.articles.length }, { status: result.ok ? 200 : 502, headers: { "cache-control": "no-store" } });
}
