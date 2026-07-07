/**
 * Référentiel pays : indicatifs téléphoniques + noms FR/EN.
 * Couverture : toute l'Afrique + destinations diaspora et internationales
 * courantes. Utilisé par PhoneInput (indicatif + drapeau) et CountrySelect.
 */

export interface Country {
  /** Code ISO 3166-1 alpha-2 */
  iso: string;
  /** Indicatif E.164, préfixé « + » */
  dial: string;
  fr: string;
  en: string;
}

export const DEFAULT_COUNTRY_ISO = 'CI';

/** Drapeau emoji dérivé du code ISO (indicateurs régionaux Unicode). */
export function flagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export function findCountry(iso: string): Country | undefined {
  return COUNTRIES.find((c) => c.iso === iso);
}

export const COUNTRIES: Country[] = [
  // ── Afrique de l'Ouest ──
  { iso: 'CI', dial: '+225', fr: 'Côte d’Ivoire', en: 'Ivory Coast' },
  { iso: 'SN', dial: '+221', fr: 'Sénégal', en: 'Senegal' },
  { iso: 'ML', dial: '+223', fr: 'Mali', en: 'Mali' },
  { iso: 'BF', dial: '+226', fr: 'Burkina Faso', en: 'Burkina Faso' },
  { iso: 'NE', dial: '+227', fr: 'Niger', en: 'Niger' },
  { iso: 'TG', dial: '+228', fr: 'Togo', en: 'Togo' },
  { iso: 'BJ', dial: '+229', fr: 'Bénin', en: 'Benin' },
  { iso: 'GH', dial: '+233', fr: 'Ghana', en: 'Ghana' },
  { iso: 'NG', dial: '+234', fr: 'Nigéria', en: 'Nigeria' },
  { iso: 'GN', dial: '+224', fr: 'Guinée', en: 'Guinea' },
  { iso: 'GW', dial: '+245', fr: 'Guinée-Bissau', en: 'Guinea-Bissau' },
  { iso: 'LR', dial: '+231', fr: 'Libéria', en: 'Liberia' },
  { iso: 'SL', dial: '+232', fr: 'Sierra Leone', en: 'Sierra Leone' },
  { iso: 'GM', dial: '+220', fr: 'Gambie', en: 'Gambia' },
  { iso: 'MR', dial: '+222', fr: 'Mauritanie', en: 'Mauritania' },
  { iso: 'CV', dial: '+238', fr: 'Cap-Vert', en: 'Cape Verde' },
  // ── Afrique centrale ──
  { iso: 'CM', dial: '+237', fr: 'Cameroun', en: 'Cameroon' },
  { iso: 'GA', dial: '+241', fr: 'Gabon', en: 'Gabon' },
  { iso: 'CG', dial: '+242', fr: 'Congo', en: 'Congo' },
  { iso: 'CD', dial: '+243', fr: 'RD Congo', en: 'DR Congo' },
  { iso: 'CF', dial: '+236', fr: 'Centrafrique', en: 'Central African Republic' },
  { iso: 'TD', dial: '+235', fr: 'Tchad', en: 'Chad' },
  { iso: 'GQ', dial: '+240', fr: 'Guinée équatoriale', en: 'Equatorial Guinea' },
  { iso: 'ST', dial: '+239', fr: 'Sao Tomé-et-Principe', en: 'São Tomé and Príncipe' },
  // ── Afrique du Nord ──
  { iso: 'MA', dial: '+212', fr: 'Maroc', en: 'Morocco' },
  { iso: 'DZ', dial: '+213', fr: 'Algérie', en: 'Algeria' },
  { iso: 'TN', dial: '+216', fr: 'Tunisie', en: 'Tunisia' },
  { iso: 'LY', dial: '+218', fr: 'Libye', en: 'Libya' },
  { iso: 'EG', dial: '+20', fr: 'Égypte', en: 'Egypt' },
  { iso: 'SD', dial: '+249', fr: 'Soudan', en: 'Sudan' },
  // ── Afrique de l'Est ──
  { iso: 'ET', dial: '+251', fr: 'Éthiopie', en: 'Ethiopia' },
  { iso: 'ER', dial: '+291', fr: 'Érythrée', en: 'Eritrea' },
  { iso: 'DJ', dial: '+253', fr: 'Djibouti', en: 'Djibouti' },
  { iso: 'SO', dial: '+252', fr: 'Somalie', en: 'Somalia' },
  { iso: 'KE', dial: '+254', fr: 'Kenya', en: 'Kenya' },
  { iso: 'UG', dial: '+256', fr: 'Ouganda', en: 'Uganda' },
  { iso: 'TZ', dial: '+255', fr: 'Tanzanie', en: 'Tanzania' },
  { iso: 'RW', dial: '+250', fr: 'Rwanda', en: 'Rwanda' },
  { iso: 'BI', dial: '+257', fr: 'Burundi', en: 'Burundi' },
  { iso: 'SS', dial: '+211', fr: 'Soudan du Sud', en: 'South Sudan' },
  // ── Afrique australe & océan Indien ──
  { iso: 'ZA', dial: '+27', fr: 'Afrique du Sud', en: 'South Africa' },
  { iso: 'NA', dial: '+264', fr: 'Namibie', en: 'Namibia' },
  { iso: 'BW', dial: '+267', fr: 'Botswana', en: 'Botswana' },
  { iso: 'ZM', dial: '+260', fr: 'Zambie', en: 'Zambia' },
  { iso: 'ZW', dial: '+263', fr: 'Zimbabwe', en: 'Zimbabwe' },
  { iso: 'MZ', dial: '+258', fr: 'Mozambique', en: 'Mozambique' },
  { iso: 'MW', dial: '+265', fr: 'Malawi', en: 'Malawi' },
  { iso: 'AO', dial: '+244', fr: 'Angola', en: 'Angola' },
  { iso: 'LS', dial: '+266', fr: 'Lesotho', en: 'Lesotho' },
  { iso: 'SZ', dial: '+268', fr: 'Eswatini', en: 'Eswatini' },
  { iso: 'MG', dial: '+261', fr: 'Madagascar', en: 'Madagascar' },
  { iso: 'MU', dial: '+230', fr: 'Maurice', en: 'Mauritius' },
  { iso: 'SC', dial: '+248', fr: 'Seychelles', en: 'Seychelles' },
  { iso: 'KM', dial: '+269', fr: 'Comores', en: 'Comoros' },
  // ── Europe ──
  { iso: 'FR', dial: '+33', fr: 'France', en: 'France' },
  { iso: 'BE', dial: '+32', fr: 'Belgique', en: 'Belgium' },
  { iso: 'CH', dial: '+41', fr: 'Suisse', en: 'Switzerland' },
  { iso: 'LU', dial: '+352', fr: 'Luxembourg', en: 'Luxembourg' },
  { iso: 'MC', dial: '+377', fr: 'Monaco', en: 'Monaco' },
  { iso: 'DE', dial: '+49', fr: 'Allemagne', en: 'Germany' },
  { iso: 'IT', dial: '+39', fr: 'Italie', en: 'Italy' },
  { iso: 'ES', dial: '+34', fr: 'Espagne', en: 'Spain' },
  { iso: 'PT', dial: '+351', fr: 'Portugal', en: 'Portugal' },
  { iso: 'NL', dial: '+31', fr: 'Pays-Bas', en: 'Netherlands' },
  { iso: 'GB', dial: '+44', fr: 'Royaume-Uni', en: 'United Kingdom' },
  { iso: 'IE', dial: '+353', fr: 'Irlande', en: 'Ireland' },
  { iso: 'RU', dial: '+7', fr: 'Russie', en: 'Russia' },
  { iso: 'TR', dial: '+90', fr: 'Turquie', en: 'Türkiye' },
  // ── Amériques ──
  { iso: 'US', dial: '+1', fr: 'États-Unis', en: 'United States' },
  { iso: 'CA', dial: '+1', fr: 'Canada', en: 'Canada' },
  { iso: 'BR', dial: '+55', fr: 'Brésil', en: 'Brazil' },
  { iso: 'MX', dial: '+52', fr: 'Mexique', en: 'Mexico' },
  { iso: 'AR', dial: '+54', fr: 'Argentine', en: 'Argentina' },
  { iso: 'HT', dial: '+509', fr: 'Haïti', en: 'Haiti' },
  // ── Moyen-Orient & Asie ──
  { iso: 'AE', dial: '+971', fr: 'Émirats arabes unis', en: 'United Arab Emirates' },
  { iso: 'SA', dial: '+966', fr: 'Arabie saoudite', en: 'Saudi Arabia' },
  { iso: 'QA', dial: '+974', fr: 'Qatar', en: 'Qatar' },
  { iso: 'KW', dial: '+965', fr: 'Koweït', en: 'Kuwait' },
  { iso: 'LB', dial: '+961', fr: 'Liban', en: 'Lebanon' },
  { iso: 'CN', dial: '+86', fr: 'Chine', en: 'China' },
  { iso: 'IN', dial: '+91', fr: 'Inde', en: 'India' },
  { iso: 'JP', dial: '+81', fr: 'Japon', en: 'Japan' },
  { iso: 'KR', dial: '+82', fr: 'Corée du Sud', en: 'South Korea' },
  { iso: 'AU', dial: '+61', fr: 'Australie', en: 'Australia' },
];
