import type { Locale } from '@/lib/i18n/routing';
import type { Bilingual } from '@/types/event-config';

/**
 * Résout un champ bilingue selon la locale active, avec fallback FR
 * quand la version EN est absente (règle CDC §1.5).
 */
export function l(field: Bilingual | null | undefined, locale: Locale): string {
  if (!field) return '';
  if (locale === 'en' && field.en && field.en.trim() !== '') return field.en;
  return field.fr;
}
