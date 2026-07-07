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

export function SpotlightSpeakers({ config, locale }: TemplateSectionProps) {
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
    <section
      id={SECTION_IDS.speakers}
      className="scroll-mt-20 bg-[var(--color-text)] px-4 py-16 text-[var(--color-bg)] sm:py-24"
    >
      <div className="container mx-auto">
        <SectionHeader title={t('speakersTitle')} />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {speakers.map((speaker, i) => (
            <ScrollReveal key={speaker.id} delayMs={(i % 3) * 120}>
              <button
                type="button"
                onClick={() => setSelected(speaker)}
                className="group flex w-full items-center gap-5 rounded-xl bg-white/[0.06] p-4 text-left transition hover:bg-white/[0.12]"
              >
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={speaker.photo_url}
                    alt={speaker.name}
                    fill
                    sizes="80px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold">{speaker.name}</p>
                  <p className="mt-0.5 truncate text-sm opacity-60">
                    {l(speaker.title, locale)}
                  </p>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-[var(--color-bg)] text-[var(--color-text)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-48 sm:h-56">
              <Image
                src={selected.photo_url}
                alt={selected.name}
                fill
                sizes="(max-width: 640px) 100vw, 512px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-6 text-white">
                <h3 className="font-display text-2xl font-bold">{selected.name}</h3>
                <p className="text-sm text-[var(--color-primary)]">
                  {l(selected.title, locale)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="absolute right-3 top-3 rounded-full bg-black/40 p-1.5 text-white transition hover:bg-black/60"
                aria-label={tCommon('close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm leading-relaxed opacity-80">{l(selected.bio, locale)}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
