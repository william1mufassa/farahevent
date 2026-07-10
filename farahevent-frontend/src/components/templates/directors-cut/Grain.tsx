/**
 * Grain cinématographique de DIRECTOR'S CUT : bruit fractal SVG en overlay
 * fixe, non cliquable, mode de fusion overlay. Purement décoratif (CSS, zéro JS).
 */
const NOISE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 opacity-[0.09] mix-blend-overlay motion-reduce:hidden"
      style={{ backgroundImage: `url("${NOISE}")` }}
    />
  );
}
