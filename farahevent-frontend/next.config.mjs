import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

/**
 * Garde de build : un bundle de production ne doit JAMAIS embarquer le mode mock.
 *
 * Next charge `.env.local` en production ; `.env.development.local` (qui remet
 * USE_MOCK=0) est dev-only. Un `next build` depuis un dossier de dev hérite donc
 * de USE_MOCK=1 sans le moindre signal. Effet : le site sert les fixtures au lieu
 * des vrais événements (zéro vente), la garde `/admin` du middleware est
 * neutralisée, et `contexts/auth.tsx` fabrique un super_admin sans authentification.
 *
 * Pourquoi c'est certain : Next remplace les `NEXT_PUBLIC_*` par leur valeur
 * littérale AU BUILD. `process.env.NEXT_PUBLIC_USE_MOCK === '1'` devient donc
 * `"1" === '1'` — le comportement est figé dans le bundle, il ne dépend plus de
 * l'environnement d'exécution. Corriger le `.env` du serveur après coup ne
 * changerait rien : il faut rebuilder.
 *
 * ⚠ Ne PAS chercher la fixture dans `.next/` pour diagnostiquer : elle y est
 * DANS LES DEUX CAS (l'`import` statique de `lib/api/events.ts` l'embarque, le
 * tree-shaking ne la retire pas). Sa présence ne prouve rien — vérifié le
 * 2026-07-17, après s'être trompé sur ce point. Le seul témoin fiable est la
 * valeur de la variable au moment du build.
 *
 * Un `git clone` frais est sain (les `.env*.local` sont gitignorés) : le risque
 * n'existe qu'en déploiement par copie de dossier. Ce garde le rend impossible
 * plutôt qu'improbable.
 */
if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_USE_MOCK === '1') {
  throw new Error(
    'Build de PRODUCTION avec NEXT_PUBLIC_USE_MOCK=1 — refusé.\n' +
      "  Le bundle servirait des fixtures et désactiverait l'authentification admin.\n" +
      '  Cause probable : un .env.local de développement présent dans le dossier de build.\n' +
      '  Correctif : retirer NEXT_PUBLIC_USE_MOCK de .env.local, ou déployer depuis un git clone.'
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const apiOrigin = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return 'http://localhost:8000';
  }
})();
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
    // Les visuels du site (hero, logos partenaires, photos intervenants, logo
    // navbar) sont saisis par l'admin via le CMS : soit des URLs sur des hôtes
    // arbitraires (inconnus au build), soit des data-URLs (dépôt de fichier via
    // ImageDropzone). Aucun n'est optimisable par l'optimiseur Next sans, au
    // choix, une allowlist wildcard — qui rouvrirait le DoS optimiseur (audit
    // §07) — ou un échec pur sur les data-URLs. On sert donc ces images telles
    // quelles ; la CSP `img-src … https:` borne les hôtes réellement chargeables.
    // Suivi #2 clos. Réactiver l'optimisation supposera un pipeline d'upload
    // backend servant les images sur un hôte connu, à réinscrire en remotePatterns.
    unoptimized: true,
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
