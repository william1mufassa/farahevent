import createMiddleware from 'next-intl/middleware';
import { routing } from '@/lib/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Tout le public passe par next-intl ; /admin et /api restent hors i18n.
  matcher: ['/((?!api|admin|_next|_vercel|.*\\..*).*)'],
};
