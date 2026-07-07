import { z } from 'zod';
import { findCountry } from '@/lib/data/countries';

/**
 * Schéma du tunnel d'achat (3 étapes visibles, CDC §4.1).
 * Les messages d'erreur sont injectés (next-intl) pour rester localisés.
 */

export const DIGITAL_METHODS = ['wave', 'orange_money', 'mtn', 'card'] as const;
export const MANUAL_OPERATORS = ['western_union', 'ria', 'moneygram', 'other'] as const;

export type DigitalMethod = (typeof DIGITAL_METHODS)[number];
export type ManualOperator = (typeof MANUAL_OPERATORS)[number];

/** Libellés d'affichage des moyens de paiement (marques — non traduits). */
export const DIGITAL_METHOD_LABELS: Record<DigitalMethod, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  mtn: 'MTN MoMo',
  card: 'Carte Visa / Mastercard',
};

export const MANUAL_OPERATOR_LABELS: Record<ManualOperator, string> = {
  western_union: 'Western Union',
  ria: 'RIA',
  moneygram: 'MoneyGram',
  other: 'Autre',
};

export interface PurchaseErrorMessages {
  required: string;
  email: string;
  phone: string;
  captcha: string;
}

export function buildPurchaseSchema(msg: PurchaseErrorMessages, requireCaptcha: boolean) {
  return z
    .object({
      formula_id: z.string().min(1, msg.required),
      first_name: z.string().trim().min(1, msg.required),
      last_name: z.string().trim().min(1, msg.required),
      email: z.string().trim().email(msg.email),
      /** ISO du pays de l'indicatif (US/CA partagent +1 → l'ISO désambiguïse). */
      dial_iso: z.string().length(2, msg.required),
      phone_national: z
        .string()
        .trim()
        .regex(/^\d[\d\s]{5,14}$/, msg.phone),
      country: z.string().trim().min(2, msg.required),
      city: z.string().optional(),
      ticket_delivery_pref: z.enum(['email', 'whatsapp', 'both']),
      payment_mode: z.enum(['digital', 'manual']),
      digital_method: z.enum(DIGITAL_METHODS).optional(),
      manual_operator: z.enum(MANUAL_OPERATORS).optional(),
      turnstile_token: z.string().optional(),
    })
    .superRefine((val, ctx) => {
      if (val.payment_mode === 'digital' && !val.digital_method) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['digital_method'], message: msg.required });
      }
      if (val.payment_mode === 'manual' && !val.manual_operator) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['manual_operator'], message: msg.required });
      }
      if (requireCaptcha && !val.turnstile_token) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['turnstile_token'], message: msg.captcha });
      }
    });
}

export type PurchaseFormData = z.infer<ReturnType<typeof buildPurchaseSchema>>;

/** Assemble le numéro E.164 : indicatif + national sans espaces ni 0 initial. */
export function assembleWhatsapp(dialIso: string, national: string): string {
  const dial = findCountry(dialIso)?.dial ?? '';
  const digits = national.replace(/\D/g, '').replace(/^0+/, '');
  return `${dial}${digits}`;
}

/** Le CAPTCHA n'est requis que si la clé site Turnstile est configurée. */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
export const CAPTCHA_REQUIRED = TURNSTILE_SITE_KEY.length > 0;
