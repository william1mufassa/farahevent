import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Primitives de navigation locale-aware pour les pages PUBLIQUES.
 * L'admin (hors i18n) continue d'utiliser next/link et next/navigation.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
