'use client';

import { useState, useRef, useEffect } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { COUNTRIES, Flag } from '@/lib/data/countries';
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
    control,
    register,
    formState: { errors },
  } = useFormContext<PurchaseFormData>();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor="phone_national">{t('whatsapp')}</Label>
      <div className="flex">
        <Controller
          name="dial_iso"
          control={control}
          render={({ field }) => {
            const selectedCountry = COUNTRIES.find((c) => c.iso === field.value) || COUNTRIES[0];
            return (
              <div className="relative" ref={containerRef}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpen(!open)}
                  className="flex h-10 w-[7.5rem] shrink-0 items-center justify-between rounded-md rounded-r-none border border-r-0 border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <span className="flex items-center gap-2">
                    <Flag iso={selectedCountry.iso} />
                    <span>{selectedCountry.iso}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </button>
                {open && (
                  <ul className="absolute z-20 mt-1 max-h-60 w-[12rem] overflow-auto rounded-md border bg-background py-1 shadow-lg">
                    {COUNTRIES.map((c) => (
                      <li key={c.iso}>
                        <button
                          type="button"
                          onClick={() => {
                            field.onChange(c.iso);
                            setOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                        >
                          <Flag iso={c.iso} />
                          <span className="font-medium">{c.iso}</span>
                          <span className="text-muted-foreground">{c.dial}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          }}
        />
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
