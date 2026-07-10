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

/** Speakers PULSE : cartes carrées à fort contraste, pop au survol, bio en overlay. */
export function PulseSpeakers({ config, locale }: TemplateSectionProps) {
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
    <section id={SECTION_IDS.speakers} className="scroll-mt-20 bg-[var(--color-bg)] px-4 py-20 text-[var(--color-text)] sm:py-28">
      <div className="container mx-auto">
        <SectionTitle title={t('speakersTitle')} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {speakers.map((s, i) => (
            <ScrollReveal key={s.id} delayMs={(i % 4) * 90}>
              <button
                type="button"
                onClick={() => setSelected(s)}
                className="group block w-full text-left outline-none"
              >
                <div className="relative aspect-square overflow-hidden border-2 border-transparent transition-colors group-hover:border-[var(--color-primary)]">
                  <Image
                    src={s.photo_url}
                    alt={s.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="mt-3 font-display text-base font-extrabold uppercase leading-tight tracking-tight">
                  {s.name}
                </p>
                <p className="text-xs opacity-60">{l(s.title, locale)}</p>
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
            className="w-full max-w-lg overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-52">
              <Image src={selected.photo_url} alt={selected.name} fill sizes="512px" className="object-cover" />
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label={tCommon('close')}
                className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-white transition hover:bg-black/70"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <h3 className="font-display text-2xl font-extrabold uppercase tracking-tight">{selected.name}</h3>
              <p className="text-sm font-semibold text-[var(--color-primary)]">{l(selected.title, locale)}</p>
              <p className="mt-3 text-sm leading-relaxed opacity-80">{l(selected.bio, locale)}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
