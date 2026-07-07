import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { Check } from 'lucide-react';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { TicketsCounter } from '@/components/shared/TicketsCounter';
import { l } from '@/lib/localized';
import { cn, formatFCFA } from '@/lib/utils';
import type { Locale } from '@/lib/i18n/routing';
import type { FormulaConfig } from '@/types/event-config';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { SectionHeader } from './SectionHeader';

export function SpotlightFormulas({ config, locale }: TemplateSectionProps) {
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
        'relative flex h-full flex-col overflow-hidden rounded-2xl border bg-[var(--color-bg)] p-8 shadow-sm transition hover:shadow-lg',
        formula.is_featured
          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
          : 'border-black/[0.08]',
      )}
    >
      {formula.is_featured && (
        <div className="absolute right-0 top-0 rounded-bl-xl bg-[var(--color-primary)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
          {t('popular')}
        </div>
      )}

      <h3 className="font-display text-xl font-bold">{l(formula.name, locale)}</h3>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-display text-4xl font-bold text-[var(--color-primary)]">
          {formatFCFA(formula.price)}
        </span>
      </div>
      {showCounter && <TicketsCounter remaining={formula.remaining} className="mt-2" />}
      <p className="mt-3 text-sm opacity-60">{l(formula.description, locale)}</p>

      <ul className="mt-6 space-y-3 text-sm">
        {formula.advantages.map((advantage, i) => (
          <li key={i} className="flex items-start gap-3">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-primary)]" />
            <span className="opacity-85">{l(advantage, locale)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-8">
        {formula.is_sold_out ? (
          <div className="cursor-not-allowed rounded-xl border border-black/10 px-6 py-3 text-center text-sm font-semibold opacity-50">
            {t('soldOut')}
          </div>
        ) : (
          <Link
            href={`/e/${slug}/acheter/${formula.channel === 'online' ? 'en-ligne' : 'presentiel'}?formula=${formula.id}`}
            className={cn(
              'block rounded-xl px-6 py-3 text-center text-sm font-semibold transition',
              formula.is_featured
                ? 'bg-[var(--color-primary)] text-white hover:opacity-90'
                : 'border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white',
            )}
          >
            {t('choose')}
          </Link>
        )}
      </div>
    </div>
  );
}
