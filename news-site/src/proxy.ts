import { NextResponse, type NextRequest } from 'next/server';
import { getSubCategory, getSpeciality } from '@/lib/categories';
import { isLocale } from '@/lib/i18n';

export default function proxy(request: NextRequest) {
  if (!process.env.ELEVATE_NEWS_SECRET || request.headers.get('x-elevate-secret') !== process.env.ELEVATE_NEWS_SECRET) {
    console.warn('[News bridge] Missing or mismatched bridge credential', { configured: Boolean(process.env.ELEVATE_NEWS_SECRET), received: Boolean(request.headers.get('x-elevate-secret')) });
    return new NextResponse('Admin login required', { status: 401 });
  }
  const industry = request.headers.get('x-elevate-industry') || '';
  if (!getSubCategory('industry', industry)) return new NextResponse('Invalid industry', { status: 403 });
  const pathname = request.nextUrl.pathname.replace(/^\/admin-news(?=\/|$)/, '');
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/') || /\.[a-z0-9]+$/i.test(pathname)) return NextResponse.next();
  const segments = pathname.split('/').filter(Boolean);
  const locale = isLocale(segments[0]) ? segments[0] : 'en';
  const ownIndustry = segments[1] === 'industry' && segments[2] === industry &&
    (segments.length === 3 || (segments.length === 4 && !!getSpeciality('industry', industry, segments[3])));
  const reader = segments[1] === 'story' && (segments.length === 3 || segments.length === 4);
  const search = segments[1] === 'search' && segments.length === 2;
  if (isLocale(segments[0]) && (ownIndustry || reader || search)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}/industry/${industry}`;
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/:path*'] };
