'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { l } from '@/lib/localized';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { SectionTitle } from './SectionTitle';

/** FAQ DIRECTOR'S CUT : accordéon sobre, séparateurs blancs fins. */
export function DirectorsCutFaq({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section id={SECTION_IDS.faq} className="scroll-mt-20 bg-black px-4 py-24 text-white sm:py-32">
      <div className="container mx-auto max-w-3xl">
        <SectionTitle title={t('faqTitle')} />
        <div className="border-t border-white/15">
          {config.faqs.map((f) => {
            const open = f.id === openId;
            return (
              <div key={f.id} className="border-b border-white/15">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : f.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left font-serif text-xl"
                >
                  {l(f.question, locale)}
                  <span
                    aria-hidden
                    className={cn(
                      'text-2xl leading-none text-[var(--color-primary)] transition-transform duration-300',
                      open && 'rotate-45',
                    )}
                  >
                    +
                  </span>
                </button>
                <div
                  className={cn(
                    'grid transition-[grid-template-rows] duration-300 ease-out',
                    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <p className="pb-5 text-sm leading-relaxed text-white/65">{l(f.answer, locale)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
