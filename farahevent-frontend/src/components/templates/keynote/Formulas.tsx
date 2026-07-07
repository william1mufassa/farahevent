import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { TicketsCounter } from '@/components/shared/TicketsCounter';
import { l } from '@/lib/localized';
import { cn, formatFCFA } from '@/lib/utils';
import { SOFT_BORDER } from '@/lib/styles';
import type { Locale } from '@/lib/i18n/routing';
import type { FormulaConfig } from '@/types/event-config';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { SectionHeader } from './SectionHeader';

/**
 * Formules KEYNOTE : cartes sobres côte à côte, bordure fine, prix en grande
 * typographie serif, avantages en liste discrète, CTA outline→fill.
 */
export function KeynoteFormulas({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const formulas = [...config.formulas].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <section id={SECTION_IDS.pricing} className="container mx-auto scroll-mt-20 px-4 py-16 sm:py-24">
      <SectionHeader title={t('pricingTitle')} />
      <div className={cn('grid gap-6 md:grid-cols-2', formulas.length > 2 && 'lg:grid-cols-3')}>
        {formulas.map((formula, i) => (
          <ScrollReveal key={formula.id} delayMs={i * 100}>
            <FormulaCard
              formula={formula}
              locale={locale}
              slug={config.event.slug}
              showCounter={config.options.show_tickets_counter}
            />
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}

function FormulaCard({
  formula,
  locale,
  slug,
  showCounter,
}: {
  formula: FormulaConfig;
  locale: Locale;
  slug: string;
  showCounter: boolean;
}) {
  const t = useTranslations('landing');
  return (
    <div
      className={cn(
        'flex h-full flex-col border bg-[var(--color-bg)] p-8 shadow-sm',
        formula.is_featured && 'border-[var(--color-primary)]',
      )}
      style={formula.is_featured ? undefined : SOFT_BORDER}
    >
      <h3 className="text-sm font-medium uppercase tracking-[0.25em]">
        {l(formula.name, locale)}
      </h3>
      <div className="mt-4 font-serif text-4xl sm:text-5xl">{formatFCFA(formula.price)}</div>
      {showCounter && <TicketsCounter remaining={formula.remaining} className="mt-2" />}
      <p className="mt-3 text-sm opacity-70">{l(formula.description, locale)}</p>

      <ul className="mt-6 space-y-2.5 text-sm">
        {formula.advantages.map((advantage, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden className="opacity-40">
              —
            </span>
            <span className="opacity-90">{l(advantage, locale)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-8">
        {formula.is_sold_out ? (
          <div
            className="cursor-not-allowed border px-6 py-3 text-center text-sm font-medium uppercase tracking-[0.2em] opacity-50"
            style={SOFT_BORDER}
          >
            {t('soldOut')}
          </div>
        ) : (
          <Link
            href={`/e/${slug}/acheter?formula=${formula.id}`}
            className="block border border-[var(--color-primary)] px-6 py-3 text-center text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-white"
          >
            {t('choose')}
          </Link>
        )}
      </div>
    </div>
  );
}
