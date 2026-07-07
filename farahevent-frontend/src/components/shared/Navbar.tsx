'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LangSwitch } from './LangSwitch';
import { LiveBadge } from './LiveBadge';

export interface NavAnchor {
  /** id de la section cible (sans #) */
  id: string;
  /** clé de traduction dans le namespace `nav` */
  key: 'about' | 'programme' | 'pricing' | 'faq' | 'speakers';
}

interface NavbarProps {
  eventName: string;
  logoUrl?: string | null;
  isLive?: boolean;
  anchors: NavAnchor[];
}

/**
 * Navbar publique (CDC §3.1) : fixed top, transparente sur le hero puis opaque
 * au scroll (fond --color-bg + blur), liens d'ancrage smooth-scroll, switch
 * FR/EN, badge EN DIRECT, burger plein écran sur mobile.
 * L'état transparent suppose un hero sombre (photo + overlay) → texte blanc.
 */
export function Navbar({ eventName, logoUrl, isLive = false, anchors }: NavbarProps) {
  const t = useTranslations('nav');
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-all duration-300',
        scrolled ? 'text-[var(--color-text)] shadow-sm backdrop-blur-md' : 'text-white',
      )}
      style={
        scrolled
          ? {
              backgroundColor: 'color-mix(in srgb, var(--color-bg) 88%, transparent)',
              borderBottom: '1px solid color-mix(in srgb, currentColor 10%, transparent)',
            }
          : undefined
      }
    >
      <nav className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <a href="#top" className="flex min-w-0 items-center gap-3" aria-label={eventName}>
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={eventName}
              width={120}
              height={32}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <span className="truncate text-base font-bold tracking-tight">{eventName}</span>
          )}
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {anchors.map((a) => (
            <a
              key={a.id}
              href={`#${a.id}`}
              className="text-sm font-medium opacity-85 transition hover:opacity-100"
            >
              {t(a.key)}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {isLive && <LiveBadge className="hidden sm:inline-flex" />}
          <LangSwitch className="hidden md:flex" />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="p-1 md:hidden"
            aria-label={t('menu')}
            aria-expanded={open}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)] px-6 py-5 text-[var(--color-text)] md:hidden"
        >
          <div className="flex items-center justify-between">
            <span className="truncate text-base font-bold">{eventName}</span>
            <button type="button" onClick={() => setOpen(false)} className="p-1" aria-label={t('close')}>
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col items-center justify-center gap-8">
            {anchors.map((a) => (
              <a
                key={a.id}
                href={`#${a.id}`}
                onClick={() => setOpen(false)}
                className="text-2xl font-semibold"
              >
                {t(a.key)}
              </a>
            ))}
          </nav>

          <div className="flex items-center justify-center gap-6 pb-4">
            {isLive && <LiveBadge />}
            <LangSwitch />
          </div>
        </div>
      )}
    </header>
  );
}
