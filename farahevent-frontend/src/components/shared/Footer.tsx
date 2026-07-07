import { getTranslations } from 'next-intl/server';
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Twitter,
  Youtube,
} from 'lucide-react';
import type { EventConfig, SocialLink } from '@/types/event-config';
import type { Locale } from '@/lib/i18n/routing';
import { l } from '@/lib/localized';
import { formatLongDate } from '@/lib/utils';
import { LangSwitch } from './LangSwitch';
import type { NavAnchor } from './Navbar';

const SOCIAL_ICONS: Record<SocialLink['kind'], typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  x: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Music2,
};

const SOFT_BORDER = { borderColor: 'color-mix(in srgb, currentColor 15%, transparent)' };

/**
 * Footer public (CDC §3 — fond inversé, 4 colonnes : Infos, Liens, Contact,
 * Réseaux). Tout le contenu vient de EventConfig.footer (configurable admin).
 */
export async function Footer({
  config,
  locale,
  anchors,
}: {
  config: EventConfig;
  locale: Locale;
  anchors: NavAnchor[];
}) {
  const t = await getTranslations('footer');
  const tNav = await getTranslations('nav');
  const { event, footer } = config;
  const name = l(event.name, locale);

  return (
    <footer className="bg-[var(--color-text)] text-[var(--color-bg)]">
      <div className="container mx-auto grid gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <FooterHeading>{t('infoTitle')}</FooterHeading>
          <p className="font-semibold">{name}</p>
          <p className="mt-1 text-sm opacity-70">
            {formatLongDate(event.date, locale)}
            {event.start_time ? ` — ${event.start_time}` : ''}
          </p>
          {(event.location || event.city) && (
            <p className="text-sm opacity-70">
              {[event.location, event.city].filter(Boolean).join(', ')}
            </p>
          )}
          <p className="mt-3 text-sm leading-relaxed opacity-70">{l(footer.about, locale)}</p>
        </div>

        <div>
          <FooterHeading>{t('linksTitle')}</FooterHeading>
          <ul className="space-y-2 text-sm">
            {anchors.map((a) => (
              <li key={a.id}>
                <a href={`#${a.id}`} className="opacity-70 transition hover:opacity-100">
                  {tNav(a.key)}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <FooterHeading>{t('contactTitle')}</FooterHeading>
          <ul className="space-y-2 text-sm">
            {footer.contact_email && (
              <li>
                <a
                  href={`mailto:${footer.contact_email}`}
                  className="inline-flex items-center gap-2 opacity-70 transition hover:opacity-100"
                >
                  <Mail className="h-4 w-4 shrink-0" /> {footer.contact_email}
                </a>
              </li>
            )}
            {footer.contact_whatsapp && (
              <li>
                <a
                  href={`https://wa.me/${footer.contact_whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 opacity-70 transition hover:opacity-100"
                >
                  <MessageCircle className="h-4 w-4 shrink-0" /> {footer.contact_whatsapp}
                </a>
              </li>
            )}
            {footer.address && (
              <li className="inline-flex items-center gap-2 opacity-70">
                <MapPin className="h-4 w-4 shrink-0" /> {footer.address}
              </li>
            )}
          </ul>
        </div>

        <div>
          <FooterHeading>{t('socialTitle')}</FooterHeading>
          <div className="flex flex-wrap gap-3">
            {footer.socials.map((s) => {
              const Icon = SOCIAL_ICONS[s.kind];
              return (
                <a
                  key={s.kind + s.url}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.kind}
                  className="rounded-full border p-2 opacity-70 transition hover:opacity-100"
                  style={SOFT_BORDER}
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t" style={SOFT_BORDER}>
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-5 text-xs opacity-70 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {name} — {t('rights')}
          </p>
          <LangSwitch />
        </div>
      </div>
    </footer>
  );
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-4 text-xs font-bold uppercase tracking-widest opacity-60">{children}</h3>;
}
