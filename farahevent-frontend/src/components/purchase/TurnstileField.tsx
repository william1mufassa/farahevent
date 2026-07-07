'use client';

import { Turnstile } from '@marsidev/react-turnstile';
import { useFormContext } from 'react-hook-form';
import type { Locale } from '@/lib/i18n/routing';
import { FieldError } from './FieldError';
import { TURNSTILE_SITE_KEY, type PurchaseFormData } from './schema';

/**
 * CAPTCHA Cloudflare Turnstile avant le CTA (CDC §4.1).
 * Sans clé site configurée (dev), le champ est absent et non requis.
 */
export function TurnstileField({ locale }: { locale: Locale }) {
  const {
    setValue,
    formState: { errors },
  } = useFormContext<PurchaseFormData>();

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <div className="space-y-2">
      <Turnstile
        siteKey={TURNSTILE_SITE_KEY}
        options={{ language: locale }}
        onSuccess={(token) => setValue('turnstile_token', token, { shouldValidate: true })}
        onExpire={() => setValue('turnstile_token', '', { shouldValidate: true })}
        onError={() => setValue('turnstile_token', '', { shouldValidate: true })}
      />
      <FieldError message={errors.turnstile_token?.message} />
    </div>
  );
}
