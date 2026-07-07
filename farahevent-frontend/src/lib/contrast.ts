/**
 * Choix automatique de la couleur de texte selon la luminance du fond (WCAG).
 * Utilisé quand l'admin choisit un fond custom sans fixer la couleur de texte.
 */

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: string): boolean {
  return HEX_RE.test(value);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const int = parseInt(h, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

export const DARK_TEXT = '#1D1D1D';
export const LIGHT_TEXT = '#FFFFFF';

/** Retourne la couleur de texte (sombre ou claire) la plus lisible sur `bgHex`. */
export function bestTextOn(bgHex: string): string {
  if (!isHexColor(bgHex)) return DARK_TEXT;
  return relativeLuminance(bgHex) > 0.4 ? DARK_TEXT : LIGHT_TEXT;
}
