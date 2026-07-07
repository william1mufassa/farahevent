import { bestTextOn, isHexColor } from '@/lib/contrast';
import { DEFAULT_COLORS, type EventDesign } from '@/types/event-config';

/**
 * Injecte les CSS variables publiques de l'événement (--color-*) dans un <style>
 * rendu côté serveur, avant le contenu : zéro FOUC, zéro JavaScript.
 * Les couleurs invalides sont remplacées par les défauts (anti-injection CSS).
 */
export function ThemeInjector({
  design,
  children,
}: {
  design: EventDesign;
  children: React.ReactNode;
}) {
  const primary = isHexColor(design.colors.primary) ? design.colors.primary : DEFAULT_COLORS.primary;
  const secondary = isHexColor(design.colors.secondary)
    ? design.colors.secondary
    : DEFAULT_COLORS.secondary;
  const bg = isHexColor(design.colors.bg) ? design.colors.bg : DEFAULT_COLORS.bg;
  const text =
    design.colors.text && isHexColor(design.colors.text) ? design.colors.text : bestTextOn(bg);

  const css = `:root{--color-primary:${primary};--color-secondary:${secondary};--color-bg:${bg};--color-text:${text};}`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {children}
    </>
  );
}
