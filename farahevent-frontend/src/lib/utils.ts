import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatEventDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(iso));
}

/** Date seule (YYYY-MM-DD) en toutes lettres, selon la locale publique. */
export function formatLongDate(isoDate: string, locale: 'fr' | 'en' = 'fr'): string {
  // Parse en heure locale (pas de Z) : affiche le même jour quel que soit le fuseau.
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    dateStyle: 'full',
  }).format(new Date(`${isoDate}T00:00:00`));
}
