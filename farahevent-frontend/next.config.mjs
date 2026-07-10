import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const apiOrigin = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return 'http://localhost:8000';
  }
})();
const apiHost = new URL(apiOrigin).hostname;
const apiWs = apiOrigin.replace(/^http/, 'ws');
const isDev = process.env.NODE_ENV !== 'production';

/**
 * CSP (audit §07). Notes d'arbitrage :
 * - style-src 'unsafe-inline' : requis par le ThemeInjector (<style> serveur)
 *   et les styles inline Next/Tiptap.
 * - script-src 'unsafe-inline' : runtime inline de Next 14 (pas de nonces sur
 *   cette version, cf. advisory CSP nonces) ; 'unsafe-eval' seulement en dev
 *   (react-refresh).
 * - connect-src/media-src https:/wss: : les flux HLS et images d'événements
 *   sont des hôtes configurés par l'admin, inconnus au build. http: reste
 *   bloqué (sauf l'API locale en dev).
 * - frame-ancestors/frame-src 'self' : préserve l'aperçu Design (iframe
 *   same-origin) tout en interdisant le framing externe.
 * - worker-src blob: : web worker de hls.js.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} ${apiWs} https: wss:`,
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Caméra : nécessaire au scan QR admin ; le reste est refusé.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Restreint aux hôtes réellement servis (audit §07 — DoS optimiseur) :
    // backend (env) + hôtes des fixtures mock.
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: apiHost },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'fastly.picsum.photos' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
    ],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  async redirects() {
    // Anciennes routes (avant alignement CDC Frontend juillet 2026).
    return [
      { source: '/paiement/succes', destination: '/confirmation', permanent: true },
      { source: '/paiement/attente', destination: '/en-attente', permanent: true },
      { source: '/paiement/echec', destination: '/echec', permanent: true },
      { source: '/mon-billet', destination: '/billet', permanent: true },
      // Renommage des routes admin en français (Lot 6).
      { source: '/admin/events', destination: '/admin/evenements', permanent: true },
      { source: '/admin/events/:path*', destination: '/admin/evenements/:path*', permanent: true },
      { source: '/admin/manual-payments', destination: '/admin/paiements', permanent: true },
      { source: '/admin/manual-payments/:path*', destination: '/admin/paiements/:path*', permanent: true },
      { source: '/admin/admins', destination: '/admin/equipe', permanent: true },
      { source: '/admin/audit-logs', destination: '/admin/activite', permanent: true },
    ];
  },
  // Note : l'ancienne réécriture dev `/api/:path*` → FastAPI a été retirée
  // (audit §07). Les rewrites afterFiles passent AVANT les routes dynamiques :
  // elle avalait /api/proxy/[...path] (BFF) — et exposait le backend sans
  // authentification. Le client public appelle l'API directement (CORS) ;
  // l'admin passe par le BFF.
};

export default withNextIntl(nextConfig);
