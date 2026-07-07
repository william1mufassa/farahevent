import { defineRouting } from 'next-intl/routing';

/**
 * Routing i18n public : FR par défaut sans préfixe (marché ivoirien),
 * EN accessible sous /en/... Le dashboard admin est hors i18n (voir middleware).
 */
export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];
