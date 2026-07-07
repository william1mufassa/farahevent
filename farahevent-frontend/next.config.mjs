import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  async redirects() {
    // Anciennes routes (avant alignement CDC Frontend juillet 2026).
    return [
      { source: '/paiement/succes', destination: '/confirmation', permanent: true },
      { source: '/paiement/attente', destination: '/en-attente', permanent: true },
      { source: '/paiement/echec', destination: '/echec', permanent: true },
      { source: '/mon-billet', destination: '/billet', permanent: true },
    ];
  },
  async rewrites() {
    // En dev, proxifie /api/* vers le backend FastAPI pour éviter les problèmes CORS.
    // (afterFiles : nos route handlers /api/* internes, ex. /api/revalidate, priment.)
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
