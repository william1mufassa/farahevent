'use client';

import { useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { COUNTRIES, flagEmoji } from '@/lib/data/countries';
import type { Locale } from '@/lib/i18n/routing';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from './FieldError';
import type { PurchaseFormData } from './schema';

/** Champ pays du formulaire d'achat (branché react-hook-form). */
export function CountrySelect({ locale }: { locale: Locale }) {
  const t = useTranslations('purchase');
  const { control } = useFormContext<PurchaseFormData>();

  return (
    <Controller
      name="country"
      control={control}
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <Label htmlFor="country">{t('country')}</Label>
          <CountryCombobox
            id="country"
            value={field.value}
            onChange={field.onChange}
            locale={locale}
            placeholder={t('countrySearch')}
          />
          <FieldError message={fieldState.error?.message} />
        </div>
      )}
    />
  );
}

/**
 * Combobox pays avec recherche (CDC : « liste déroulante avec recherche »).
 * Stocke le nom localisé (le backend attend une chaîne pays).
 * Réutilisé hors react-hook-form par le formulaire de preuve manuelle.
 */
export function CountryCombobox({
  id,
  value,
  onChange,
  locale,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (name: string) => void;
  locale: Locale;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const entries = useMemo(
    () =>
      COUNTRIES.map((c) => ({ iso: c.iso, name: locale === 'en' ? c.en : c.fr })).sort((a, b) =>
        a.name.localeCompare(b.name, locale),
      ),
    [locale],
  );

  const filtered = query.trim()
    ? entries.filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()))
    : entries;

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
        value={open ? query : value}
        placeholder={open ? placeholder : value || placeholder}
        onFocus={() => {
          setQuery('');
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onChange={(e) => setQuery(e.target.value)}
        className="pr-8"
      />
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />

      {open && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-background py-1 shadow-lg"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">—</li>
          )}
          {filtered.map((entry) => (
            <li key={entry.iso}>
              <button
                type="button"
                role="option"
                aria-selected={entry.name === value}
                // mousedown : sélectionne avant que le blur ne ferme la liste
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(entry.name);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span aria-hidden>{flagEmoji(entry.iso)}</span>
                {entry.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
