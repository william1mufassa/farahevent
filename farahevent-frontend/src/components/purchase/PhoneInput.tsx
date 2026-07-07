'use client';

import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { COUNTRIES, flagEmoji } from '@/lib/data/countries';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from './FieldError';
import type { PurchaseFormData } from './schema';

/**
 * Champ WhatsApp : sélecteur d'indicatif pays (drapeaux) + numéro national.
 * Le numéro E.164 est assemblé à la soumission (schema.assembleWhatsapp).
 */
export function PhoneInput() {
  const t = useTranslations('purchase');
  const {
    register,
    formState: { errors },
  } = useFormContext<PurchaseFormData>();

  return (
    <div className="space-y-2">
      <Label htmlFor="phone_national">{t('whatsapp')}</Label>
      <div className="flex">
        <select
          {...register('dial_iso')}
          aria-label={t('dialCode')}
          className="h-10 w-[7.5rem] shrink-0 rounded-md rounded-r-none border border-r-0 border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {flagEmoji(c.iso)} {c.dial}
            </option>
          ))}
        </select>
        <Input
          id="phone_national"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={t('phonePlaceholder')}
          className="rounded-l-none"
          {...register('phone_national')}
        />
      </div>
      <FieldError message={errors.phone_national?.message} />
    </div>
  );
}
