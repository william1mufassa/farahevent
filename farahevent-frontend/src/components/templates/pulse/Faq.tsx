'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { l } from '@/lib/localized';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { SectionTitle } from './SectionTitle';

/** FAQ PULSE : accordéon à bordures épaisses. */
export function PulseFaq({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section id={SECTION_IDS.faq} className="scroll-mt-20 bg-[var(--color-bg)] px-4 py-20 text-[var(--color-text)] sm:py-28">
      <div className="container mx-auto max-w-3xl">
        <SectionTitle title={t('faqTitle')} />
        <div className="space-y-3">
          {config.faqs.map((f) => {
            const open = f.id === openId;
            return (
              <div
                key={f.id}
                className={cn(
                  'border-2 transition-colors',
                  open ? 'border-[var(--color-primary)]' : 'border-[var(--color-text)]/15',
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : f.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left font-display text-base font-extrabold uppercase tracking-tight"
                >
                  {l(f.question, locale)}
                  <Plus
                    className={cn(
                      'h-5 w-5 shrink-0 text-[var(--color-primary)] transition-transform duration-300',
                      open && 'rotate-45',
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
                    <p className="px-5 pb-5 text-sm leading-relaxed opacity-75">{l(f.answer, locale)}</p>
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
