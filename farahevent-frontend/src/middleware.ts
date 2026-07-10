import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/lib/i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Inline au build — en mock (dev sans backend) la garde est neutralisée.
const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === '1';
const ACCESS_COOKIE = 'fe_access';
const REFRESH_COOKIE = 'fe_refresh';

/**
 * /admin/* : garde de session par cookie httpOnly (défense en profondeur —
 * l'API reste l'autorité via le proxy BFF). Le reste du site passe par
 * next-intl. /api est hors matcher.
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (IS_MOCK || pathname === '/admin/login') return NextResponse.next();

    const hasSession =
      request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE);
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.search = '';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  // Public (i18n) + /admin (garde) ; /api et les statiques restent hors middleware.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
