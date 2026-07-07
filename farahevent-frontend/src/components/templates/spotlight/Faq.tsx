'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { l } from '@/lib/localized';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { SectionHeader } from './SectionHeader';

export function SpotlightFaq({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section id={SECTION_IDS.faq} className="container mx-auto max-w-3xl scroll-mt-20 px-4 py-16 sm:py-24">
      <SectionHeader title={t('faqTitle')} />

      <div className="space-y-3">
        {config.faqs.map((faq, i) => {
          const open = faq.id === openId;
          return (
            <ScrollReveal key={faq.id} delayMs={i * 60}>
              <div
                className={cn(
                  'overflow-hidden rounded-xl border transition-colors',
                  open
                    ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/[0.03]'
                    : 'border-black/[0.06] bg-black/[0.01]',
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : faq.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left font-display font-semibold"
                >
                  {l(faq.question, locale)}
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 flex-shrink-0 text-[var(--color-primary)] transition-transform duration-300',
                      open && 'rotate-180',
                    )}
                  />
                </button>
                <div
                  className={cn(
                    'grid transition-[grid-template-rows] duration-300 ease-out',
                    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed opacity-75">
                      {l(faq.answer, locale)}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
