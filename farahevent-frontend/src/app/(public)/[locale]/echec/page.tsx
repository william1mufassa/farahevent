'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { SOFT_BORDER } from '@/lib/styles';

export default function FailurePage() {
  const t = useTranslations('failure');
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') ?? '';
  const slug = searchParams.get('e');
  const messageKey = reason === 'FAILED' || reason === 'REJECTED' ? reason : 'default';
  const backHref = slug ? `/e/${slug}` : '/';

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border p-10 text-center" style={SOFT_BORDER}>
        <AnimatedX />
        <h1 className="mt-6 text-2xl font-bold">{t('title')}</h1>
        <p className="mt-3 text-sm leading-relaxed opacity-70">{t(messageKey)}</p>

        <Link
          href={backHref}
          className="mt-8 block rounded-xl bg-[var(--color-primary,#e63946)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {t('backToTickets')}
        </Link>
      </div>
    </main>
  );
}

function AnimatedX() {
  return (
    <svg
      viewBox="0 0 80 80"
      className="mx-auto h-20 w-20"
      aria-hidden
    >
      <circle
        cx="40"
        cy="40"
        r="36"
        fill="none"
        stroke="#ef4444"
        strokeWidth="3"
        strokeDasharray="226"
        strokeDashoffset="226"
        className="[animation:draw-stroke_0.6s_ease-out_forwards]"
      />
      <line
        x1="28"
        y1="28"
        x2="52"
        y2="52"
        stroke="#ef4444"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="34"
        strokeDashoffset="34"
        className="[animation:draw-stroke_0.4s_ease-out_0.4s_forwards]"
      />
      <line
        x1="52"
        y1="28"
        x2="28"
        y2="52"
        stroke="#ef4444"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="34"
        strokeDashoffset="34"
        className="[animation:draw-stroke_0.4s_ease-out_0.55s_forwards]"
      />
    </svg>
  );
}
