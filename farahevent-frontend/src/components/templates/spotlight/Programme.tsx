'use client';

import { useTranslations } from 'next-intl';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { l } from '@/lib/localized';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { SectionHeader } from './SectionHeader';

export function SpotlightProgramme({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const sessions = [...config.programme].sort((a, b) => a.sort_order - b.sort_order);
  const speakerById = new Map(config.speakers.map((s) => [s.id, s.name]));

  return (
    <section
      id={SECTION_IDS.programme}
      className="container mx-auto max-w-3xl scroll-mt-20 px-4 py-16 sm:py-24"
    >
      <SectionHeader title={t('programmeTitle')} />

      <div className="relative">
        <div
          aria-hidden
          className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-[var(--color-primary)] opacity-20"
        />

        <div className="space-y-0">
          {sessions.map((session, i) => {
            const names = session.speaker_ids
              .map((id) => speakerById.get(id))
              .filter((n): n is string => Boolean(n));
            const description = l(session.description, locale);

            return (
              <ScrollReveal key={session.id} delayMs={i * 80}>
                <div className="relative flex gap-6 py-4 pl-1">
                  <div className="relative z-10 mt-1.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">
                    {session.start_time.slice(0, 2)}h
                  </div>

                  <div className="min-w-0 flex-1 rounded-xl border border-black/[0.06] bg-black/[0.02] p-4 transition hover:shadow-md">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-display font-bold">{l(session.title, locale)}</h3>
                      <span className="flex-shrink-0 text-xs font-medium tabular-nums opacity-50">
                        {session.start_time}
                        {session.end_time && ` – ${session.end_time}`}
                      </span>
                    </div>
                    {description && (
                      <p className="mt-1.5 text-sm leading-relaxed opacity-70">{description}</p>
                    )}
                    {names.length > 0 && (
                      <p className="mt-2 text-xs font-semibold text-[var(--color-primary)]">
                        {names.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
