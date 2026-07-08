'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MessageCircle,
  MonitorX,
  PlayCircle,
  Radio,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';
import type { LiveSession } from '@/types/live';
import { LivePlayer } from './LivePlayer';
import { Watermark } from './Watermark';
import { ViewerCount } from './ViewerCount';

/* ── Coquille sombre neutre (aucun template, aucune couleur d'événement) ─── */

function LivePill() {
  const t = useTranslations('live');
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
      <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
      {t('badge')}
    </span>
  );
}

function LiveShell({
  eventName,
  live = false,
  children,
}: {
  eventName: string | null;
  live?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0b0b0f] text-white">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <span className="font-display text-sm font-bold tracking-wide sm:text-base">
          {eventName ?? 'FarahEvent'}
        </span>
        {live && <LivePill />}
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-10">{children}</main>
    </div>
  );
}

function StateCard({
  icon: Icon,
  iconClass,
  title,
  children,
}: {
  icon: typeof Radio;
  iconClass?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center sm:p-10">
      <Icon className={cn('mx-auto h-14 w-14', iconClass)} aria-hidden />
      <h1 className="mt-5 font-display text-2xl font-bold">{title}</h1>
      <div className="mt-3 text-sm leading-relaxed text-white/60">{children}</div>
    </div>
  );
}

function SupportActions({
  support,
  className,
}: {
  support: LiveSession['support'] | undefined;
  className?: string;
}) {
  const t = useTranslations('live');
  const wa = support?.whatsapp_number
    ? `https://wa.me/${support.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(t('waPrefill'))}`
    : null;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <MessageCircle className="h-4 w-4" />
          {t('contactSupport', { service: support?.service_name ?? 'Support' })}
        </a>
      )}
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-white/80 transition hover:bg-white/5"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('backHome')}
      </Link>
    </div>
  );
}

/** Compte à rebours sombre pour l'état `waiting`. SSR-safe (tirets au 1er rendu). */
function DarkCountdown({ targetIso }: { targetIso: string | null }) {
  const t = useTranslations('countdown');
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!targetIso) return null;
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) return null;

  const total = now === null ? null : Math.max(0, Math.floor((target - now) / 1000));
  const cells: Array<[number | null, 'days' | 'hours' | 'minutes' | 'seconds']> = [
    [total === null ? null : Math.floor(total / 86400), 'days'],
    [total === null ? null : Math.floor((total % 86400) / 3600), 'hours'],
    [total === null ? null : Math.floor((total % 3600) / 60), 'minutes'],
    [total === null ? null : total % 60, 'seconds'],
  ];

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6">
      {cells.map(([value, key]) => (
        <div key={key} className="text-center">
          <div className="min-w-[2.5ch] font-display text-3xl font-bold tabular-nums sm:text-4xl">
            {value === null ? '––' : String(value).padStart(2, '0')}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-white/50">{t(key)}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Les 5 états ─────────────────────────────────────────────────────────── */

export function LiveLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0b0f] text-white">
      <Loader2 className="h-8 w-8 animate-spin text-white/50" aria-hidden />
    </div>
  );
}

export function InvalidState({ session }: { session: LiveSession | undefined }) {
  const t = useTranslations('live');
  return (
    <LiveShell eventName={session?.event.name ?? null}>
      <StateCard icon={ShieldAlert} iconClass="text-red-400" title={t('invalidTitle')}>
        <p>{t('invalidBody')}</p>
        <SupportActions support={session?.support} className="mt-6" />
      </StateCard>
    </LiveShell>
  );
}

export function WaitingState({
  session,
  onRefresh,
}: {
  session: LiveSession | undefined;
  onRefresh: () => void;
}) {
  const t = useTranslations('live');
  return (
    <LiveShell eventName={session?.event.name ?? null}>
      <StateCard icon={Radio} iconClass="text-white/80" title={t('waitingTitle')}>
        <p>{t('waitingBody')}</p>
        <div className="mt-6">
          <DarkCountdown targetIso={session?.starts_at ?? null} />
        </div>
        <p className="mt-6 text-xs text-white/40">{t('autoRefresh')}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="mx-auto mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/5"
        >
          <RefreshCw className="h-4 w-4" />
          {t('refresh')}
        </button>
      </StateCard>
    </LiveShell>
  );
}

export function PlayingState({ session }: { session: LiveSession }) {
  return (
    <LiveShell eventName={session.event.name} live>
      <div className="w-full max-w-5xl">
        <LivePlayer src={session.stream_url as string} subtitles={session.subtitles}>
          {session.viewer && (
            <Watermark name={session.viewer.name} email={session.viewer.email} />
          )}
          <ViewerCount />
        </LivePlayer>
      </div>
    </LiveShell>
  );
}

export function EjectedState() {
  const t = useTranslations('live');
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0b0b0f]/95 px-4 text-center text-white backdrop-blur">
      <MonitorX className="h-16 w-16 text-amber-400" aria-hidden />
      <h1 className="mt-6 font-display text-2xl font-bold sm:text-3xl">{t('ejectedTitle')}</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">{t('ejectedBody')}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
      >
        <PlayCircle className="h-4 w-4" />
        {t('watchHere')}
      </button>
    </div>
  );
}

export function EndedState({ session }: { session: LiveSession | undefined }) {
  const t = useTranslations('live');
  return (
    <LiveShell eventName={session?.event.name ?? null}>
      <StateCard icon={CheckCircle2} iconClass="text-emerald-400" title={t('endedTitle')}>
        <p>{t('endedBody')}</p>
        {session?.replay_url && (
          <a
            href={session.replay_url}
            target="_blank"
            rel="noreferrer"
            className="mx-auto mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            <PlayCircle className="h-4 w-4" />
            {t('watchReplay')}
          </a>
        )}
        <div className="mt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 text-sm text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backHome')}
          </Link>
        </div>
      </StateCard>
    </LiveShell>
  );
}
