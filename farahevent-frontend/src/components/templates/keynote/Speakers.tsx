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
import { SectionHeader } from './SectionHeader';

/**
 * Speakers KEYNOTE : grille régulière 4/2/1, cadres rectilignes ratio 3:4,
 * nom en petites capitales, apparition en cascade (stagger 100 ms),
 * expansion en overlay au clic avec bio complète.
 */
export function KeynoteSpeakers({ config, locale }: TemplateSectionProps) {
  const t = useTranslations('landing');
  const tCommon = useTranslations('common');
  const [selected, setSelected] = useState<Speaker | null>(null);
  const speakers = [...config.speakers].sort((a, b) => a.sort_order - b.sort_order);

  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [selected]);

  return (
    <section id={SECTION_IDS.speakers} className="container mx-auto scroll-mt-20 px-4 py-16 sm:py-24">
      <SectionHeader title={t('speakersTitle')} />

      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {speakers.map((speaker, i) => (
          <ScrollReveal key={speaker.id} delayMs={(i % 4) * 100}>
            <button
              type="button"
              onClick={() => setSelected(speaker)}
              className="group block w-full text-left"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-black/5">
                <Image
                  src={speaker.photo_url}
                  alt={speaker.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <p className="mt-4 text-sm font-medium uppercase tracking-[0.2em]">{speaker.name}</p>
              <p className="mt-1 text-xs opacity-60">{l(speaker.title, locale)}</p>
            </button>
          </ScrollReveal>
        ))}
      </div>

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selected.name}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="grid w-full max-w-2xl overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)] shadow-2xl sm:grid-cols-[240px_1fr]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[3/4] sm:aspect-auto">
              <Image
                src={selected.photo_url}
                alt={selected.name}
                fill
                sizes="(max-width: 640px) 100vw, 240px"
                className="object-cover"
              />
            </div>
            <div className="relative p-6 sm:p-8">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="absolute right-4 top-4 p-1 opacity-60 transition hover:opacity-100"
                aria-label={tCommon('close')}
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="pr-8 font-serif text-2xl">{selected.name}</h3>
              <p className="mt-1 text-sm text-[var(--color-primary)]">
                {l(selected.title, locale)}
              </p>
              <p className="mt-4 text-sm leading-relaxed opacity-80">{l(selected.bio, locale)}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
