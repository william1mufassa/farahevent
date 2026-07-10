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

/** Formules DIRECTOR'S CUT : cartes sombres, bordure fine, prix serif. */
export function DirectorsCutFormulas({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const formulas = [...config.formulas].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <section id={SECTION_IDS.pricing} className="scroll-mt-20 bg-black px-4 py-24 text-white sm:py-32">
      <div className="container mx-auto">
        <SectionTitle title={t('pricingTitle')} />
        <div className={cn('grid gap-6 md:grid-cols-2', formulas.length > 2 && 'lg:grid-cols-3')}>
          {formulas.map((f, i) => (
            <ScrollReveal key={f.id} delayMs={i * 100}>
              <FormulaCard
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
        'flex h-full flex-col border p-8',
        formula.is_featured ? 'border-[var(--color-primary)]' : 'border-white/15',
      )}
    >
      <h3 className="text-sm font-medium uppercase tracking-[0.25em] text-white/70">{l(formula.name, locale)}</h3>
      <div className="mt-4 font-serif text-5xl">{formatFCFA(formula.price)}</div>
      {showCounter && <TicketsCounter remaining={formula.remaining} className="mt-2 text-white/60" />}
      <p className="mt-3 text-sm text-white/60">{l(formula.description, locale)}</p>

      <ul className="mt-6 space-y-2.5 text-sm">
        {formula.advantages.map((a, i) => (
          <li key={i} className="flex gap-3 text-white/80">
            <span aria-hidden className="text-[var(--color-primary)]">
              —
            </span>
            {l(a, locale)}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-8">
        {formula.is_sold_out ? (
          <div className="cursor-not-allowed border border-white/15 px-6 py-3 text-center text-sm font-medium uppercase tracking-[0.2em] text-white/40">
            {t('soldOut')}
          </div>
        ) : (
          <Link
            href={`/e/${slug}/acheter/${formula.channel === 'online' ? 'en-ligne' : 'presentiel'}?formula=${formula.id}`}
            className="block border border-white/50 px-6 py-3 text-center text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]"
          >
            {t('choose')}
          </Link>
        )}
      </div>
    </div>
  );
}
