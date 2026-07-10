import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { TicketsCounter } from '@/components/shared/TicketsCounter';
import { l } from '@/lib/localized';
import { cn, formatFCFA } from '@/lib/utils';
import type { Locale } from '@/lib/i18n/routing';
import type { FormulaConfig } from '@/types/event-config';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { SectionTitle } from './SectionTitle';

/** Formules PULSE : cartes à bordure épaisse, prix display, populaire en primaire. */
export function PulseFormulas({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const formulas = [...config.formulas].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <section id={SECTION_IDS.pricing} className="scroll-mt-20 bg-[var(--color-bg)] px-4 py-20 text-[var(--color-text)] sm:py-28">
      <div className="container mx-auto">
        <SectionTitle title={t('pricingTitle')} />
        <div className={cn('grid gap-5 md:grid-cols-2', formulas.length > 2 && 'lg:grid-cols-3')}>
          {formulas.map((f, i) => (
            <ScrollReveal key={f.id} delayMs={i * 100}>
              <Card
                formula={f}
                locale={locale}
                slug={config.event.slug}
                showCounter={config.options.show_tickets_counter}
              />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Card({
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
  const featured = formula.is_featured;
  return (
    <div
      className={cn(
        'flex h-full flex-col border-2 p-7',
        featured ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/[0.06]' : 'border-[var(--color-text)]/15',
      )}
    >
      {featured && (
        <span className="mb-3 self-start bg-[var(--color-primary)] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white">
          {t('popular')}
        </span>
      )}
      <h3 className="font-display text-lg font-extrabold uppercase tracking-tight">{l(formula.name, locale)}</h3>
      <div className="mt-2 font-display text-4xl font-extrabold text-[var(--color-primary)]">
        {formatFCFA(formula.price)}
      </div>
      {showCounter && <TicketsCounter remaining={formula.remaining} className="mt-2" />}
      <p className="mt-3 text-sm opacity-60">{l(formula.description, locale)}</p>

      <ul className="mt-5 space-y-2 text-sm">
        {formula.advantages.map((a, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="font-extrabold text-[var(--color-primary)]">
              ›
            </span>
            {l(a, locale)}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-7">
        {formula.is_sold_out ? (
          <div className="cursor-not-allowed border-2 border-[var(--color-text)]/15 px-6 py-3 text-center text-sm font-extrabold uppercase tracking-wide opacity-50">
            {t('soldOut')}
          </div>
        ) : (
          <Link
            href={`/e/${slug}/acheter/${formula.channel === 'online' ? 'en-ligne' : 'presentiel'}?formula=${formula.id}`}
            className={cn(
              'block px-6 py-3 text-center text-sm font-extrabold uppercase tracking-wide transition',
              featured
                ? 'bg-[var(--color-primary)] text-white hover:opacity-90'
                : 'border-2 border-[var(--color-text)] hover:bg-[var(--color-text)] hover:text-[var(--color-bg)]',
            )}
          >
            {t('choose')}
          </Link>
        )}
      </div>
    </div>
  );
}
