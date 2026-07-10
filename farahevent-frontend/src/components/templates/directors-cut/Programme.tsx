import { useTranslations } from 'next-intl';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { l } from '@/lib/localized';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { SectionTitle } from './SectionTitle';

/** Programme DIRECTOR'S CUT : lignes serif épurées sur fond noir. */
export function DirectorsCutProgramme({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const sessions = [...config.programme].sort((a, b) => a.sort_order - b.sort_order);
  const speakerById = new Map(config.speakers.map((s) => [s.id, s.name]));

  return (
    <section id={SECTION_IDS.programme} className="scroll-mt-20 bg-black px-4 py-24 text-white sm:py-32">
      <div className="container mx-auto max-w-4xl">
        <SectionTitle title={t('programmeTitle')} />
        <div className="border-y border-white/10">
          {sessions.map((s) => {
            const names = s.speaker_ids
              .map((id) => speakerById.get(id))
              .filter((n): n is string => Boolean(n));
            const desc = l(s.description, locale);
            return (
              <ScrollReveal key={s.id}>
                <div className="grid grid-cols-[80px_1fr] gap-6 border-b border-white/10 py-6 last:border-b-0 sm:grid-cols-[150px_1fr]">
                  <div className="font-serif text-2xl tabular-nums text-white/45">{s.start_time}</div>
                  <div>
                    <h3 className="font-serif text-2xl leading-tight">{l(s.title, locale)}</h3>
                    {desc && <p className="mt-2 text-sm leading-relaxed text-white/60">{desc}</p>}
                    {names.length > 0 && (
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--color-primary)]">
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
