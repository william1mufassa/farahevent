'use client';

import { useAdminUi } from '@/stores/useAdminUi';

/**
 * Encres graphiques (palette dataviz validée). Une seule teinte de série
 * (magnitude mono-série) ; axes/grille recessifs. Sélectionnées par thème,
 * pas un flip automatique (les pas foncés sont choisis pour la surface #1A1D26).
 */
export interface ChartInk {
  series: string;
  axis: string;
  grid: string;
  baseline: string;
}

export const CHART_LIGHT: ChartInk = {
  series: '#4f46e5',
  axis: '#898781',
  grid: '#e1e0d9',
  baseline: '#c3c2b7',
};

export const CHART_DARK: ChartInk = {
  series: '#a78bfa',
  axis: '#898781',
  grid: '#2c2c2a',
  baseline: '#383835',
};

export function useChartInk(): ChartInk {
  const theme = useAdminUi((s) => s.theme);
  return theme === 'dark' ? CHART_DARK : CHART_LIGHT;
}

/** FCFA compact pour les axes (48 650 000 → « 48,7 M »). */
export function compactFcfa(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`;
  if (n >= 1_000) return `${Math.round(n / 1000)} k`;
  return String(n);
}
