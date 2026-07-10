import { l } from '@/lib/localized';
import type { Bilingual } from '@/types/event-config';
import type { Locale } from '@/lib/i18n/routing';

/**
 * Bande défilante PULSE (options.marquee_text). Contraste garanti : couleur de
 * texte en fond, couleur de fond en texte. Statique si prefers-reduced-motion.
 */
export function MarqueeBand({ text, locale }: { text: Bilingual; locale: Locale }) {
  const value = l(text, locale);
  const items = Array.from({ length: 8 }, () => value);

  return (
    <div className="overflow-hidden border-y-2 border-[var(--color-text)] bg-[var(--color-text)] py-3 text-[var(--color-bg)]">
      <div className="flex w-max animate-marquee gap-6 whitespace-nowrap motion-reduce:animate-none">
        {[...items, ...items].map((it, i) => (
          <span key={i} className="font-display text-lg font-extrabold uppercase tracking-wide">
            {it}
            <span aria-hidden className="mx-3 text-[var(--color-primary)]">
              ✦
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
