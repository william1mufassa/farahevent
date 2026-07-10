'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { l } from '@/lib/localized';
import type { Speaker } from '@/types/event-config';
import type { TemplateSectionProps } from '../types';
import { SECTION_IDS } from '../types';
import { SectionTitle } from './SectionTitle';

/** Speakers DIRECTOR'S CUT : grands portraits N&B → couleur au survol, bio en overlay. */
export function DirectorsCutSpeakers({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const tCommon = useTranslations('common');
  const [selected, setSelected] = useState<Speaker | null>(null);
  const speakers = [...config.speakers].sort((a, b) => a.sort_order - b.sort_order);

  useEffect(() => {
    if (!selected) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [selected]);

  return (
    <section id={SECTION_IDS.speakers} className="scroll-mt-20 bg-black px-4 py-24 text-white sm:py-32">
      <div className="container mx-auto">
        <SectionTitle title={t('speakersTitle')} />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {speakers.map((s, i) => (
            <ScrollReveal key={s.id} delayMs={(i % 3) * 120}>
              <button type="button" onClick={() => setSelected(s)} className="group block w-full text-left">
                <div className="relative aspect-[4/5] overflow-hidden">
                  <Image
                    src={s.photo_url}
                    alt={s.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover grayscale transition-all duration-700 group-hover:scale-[1.03] group-hover:grayscale-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="font-serif text-2xl leading-tight">{s.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--color-primary)]">
                      {l(s.title, locale)}
                    </p>
                  </div>
                </div>
              </button>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selected.name}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="grid w-full max-w-2xl overflow-hidden border border-white/15 bg-black text-white shadow-2xl sm:grid-cols-[240px_1fr]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/5] sm:aspect-auto">
              <Image src={selected.photo_url} alt={selected.name} fill sizes="240px" className="object-cover" />
            </div>
            <div className="relative p-6 sm:p-8">
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label={tCommon('close')}
                className="absolute right-4 top-4 p-1 text-white/60 transition hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="pr-8 font-serif text-3xl">{selected.name}</h3>
              <p className="mt-1 text-sm uppercase tracking-[0.2em] text-[var(--color-primary)]">
                {l(selected.title, locale)}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-white/70">{l(selected.bio, locale)}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
