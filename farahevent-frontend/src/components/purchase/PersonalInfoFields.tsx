'use client';

import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Locale } from '@/lib/i18n/routing';
import { PhoneInput } from './PhoneInput';
import { CountrySelect } from './CountrySelect';
import { FieldError } from './FieldError';
import type { PurchaseFormData } from './schema';

/** Étape 2 — informations personnelles (CDC §4.1), validation temps réel. */
export function PersonalInfoFields({ locale }: { locale: Locale }) {
  const t = useTranslations('purchase');
  const {
    register,
    formState: { errors },
  } = useFormContext<PurchaseFormData>();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name">{t('firstName')}</Label>
          <Input id="first_name" autoComplete="given-name" {...register('first_name')} />
          <FieldError message={errors.first_name?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">{t('lastName')}</Label>
          <Input id="last_name" autoComplete="family-name" {...register('last_name')} />
          <FieldError message={errors.last_name?.message} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
        <FieldError message={errors.email?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <PhoneInput />
        <CountrySelect locale={locale} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">{t('city')}</Label>
          <Input id="city" autoComplete="address-level2" {...register('city')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ticket_delivery_pref">{t('delivery')}</Label>
          <select
            id="ticket_delivery_pref"
            {...register('ticket_delivery_pref')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="both">{t('deliveryBoth')}</option>
            <option value="email">{t('deliveryEmail')}</option>
            <option value="whatsapp">{t('deliveryWhatsapp')}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
