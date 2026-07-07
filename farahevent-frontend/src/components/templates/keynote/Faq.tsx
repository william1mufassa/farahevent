'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { SOFT_BORDER } from '@/lib/styles';
import { l } from '@/lib/localized';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { KeynoteSection } from './KeynoteSection';

/**
 * FAQ KEYNOTE : accordéon une-question-à-la-fois, icône + qui pivote en ×,
 * dépliage animé (grid-template-rows 0fr→1fr). Titre à droite (alternance).
 */
export function KeynoteFaq({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <KeynoteSection id={SECTION_IDS.faq} title={t('faqTitle')} flip>
      <div className="border-t" style={SOFT_BORDER}>
        {config.faqs.map((faq) => {
          const open = faq.id === openId;
          return (
            <div key={faq.id} className="border-b" style={SOFT_BORDER}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : faq.id)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 py-5 text-left font-medium"
              >
                {l(faq.question, locale)}
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
                  <p className="pb-5 text-sm leading-relaxed opacity-75">
                    {l(faq.answer, locale)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </KeynoteSection>
  );
}
