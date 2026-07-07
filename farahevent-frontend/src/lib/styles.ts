import type { CSSProperties } from 'react';

/**
 * Bordure discrète qui suit la couleur de texte courante — lisible sur fond
 * clair comme sombre (les couleurs publiques sont configurées par événement).
 */
export const SOFT_BORDER: CSSProperties = {
  borderColor: 'color-mix(in srgb, currentColor 15%, transparent)',
};
