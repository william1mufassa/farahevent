# CONCEPTION FRONTEND — FarahEvent

> **Version** : 1.0 — 7 juillet 2026
> **Référence** : CDC Frontend (juillet 2026) + CDC v2.0 (juin 2026) + Plan de développement v1.0
> **Corrections projet** : paiement digital = **PayDunya** (pas CinetPay), WhatsApp = **OpenWA** (pas Evolution API). Le frontend reste provider-agnostic — aucun nom de provider en dur dans l'UI.

---

## 1. Principes directeurs

1. **SSR-first pour le public** : la landing et les pages d'achat sont des Server Components qui fetchent la config côté serveur (SEO, LCP, pas de flash de contenu). Les animations et l'interactivité sont des îlots clients qui reçoivent les données en props.
2. **Un seul modèle de données, quatre rendus** : les 4 templates (A KEYNOTE, B SPOTLIGHT, C DIRECTOR'S CUT, D PULSE) implémentent le même contrat de sections. Changer de template ne change ni les données ni les routes.
3. **Deux systèmes de theming étanches** :
   - Public : variables `--color-primary/secondary/bg/text` injectées depuis l'API par événement (CDC §1.4).
   - Admin : tokens shadcn HSL avec dark/light, jamais affectés par les couleurs d'un événement.
4. **i18n public uniquement** : next-intl avec segment `[locale]` sur les routes publiques ; `/admin/*` reste hors i18n (français en dur).
5. **Progressive enhancement mesuré** : profil de motion détecté à l'exécution (`full | reduced | minimal`), GSAP/Framer lazy-loadés seulement si le profil le permet. Lighthouse mobile > 80 est un critère de validation, pas un vœu.
6. **Multi-événements par slug** : le routing `/e/[slug]/…` existant est conservé (CDC v2 §3.5 : plusieurs événements simultanés, un seul dashboard). Les routes du CDC Frontend (`/acheter/presentiel`, etc.) se lisent comme relatives à l'événement.
7. **Le backend est la source de vérité** : le frontend ne calcule rien de métier (stocks, statuts, montants). Il affiche, valide localement pour l'UX, et laisse l'API trancher.

---

## 2. Arborescence des routes

```
src/app/
├── layout.tsx                        # Racine minimale : <html><body>, fonts
├── [locale]/                         # ═══ PUBLIC (fr par défaut, en préfixé) ═══
│   ├── layout.tsx                    # NextIntlClientProvider, QueryProvider public
│   ├── page.tsx                      # Liste événements / redirect si unique (existant)
│   ├── e/[slug]/
│   │   ├── page.tsx                  # Landing — RSC, template A/B/C/D
│   │   ├── acheter/
│   │   │   ├── presentiel/page.tsx   # Standard + VIP
│   │   │   └── en-ligne/page.tsx     # Standard Online uniquement
│   │   └── opengraph-image.tsx       # OG dynamique par événement
│   ├── confirmation/page.tsx         # Post-paiement réussi (?ref=ORD-…)
│   ├── en-attente/page.tsx           # Paiement manuel soumis (?ref=ORD-…)
│   ├── echec/page.tsx                # Retour PayDunya en échec (hors CDC, nécessaire)
│   ├── billet/page.tsx               # Re-livraison (email + n° commande)
│   ├── live/page.tsx                 # Player — design neutre, ?token=JWT
│   └── not-found.tsx                 # 404 stylée template actif si slug connu
└── admin/                            # ═══ ADMIN (FR only, hors [locale]) ═══
    ├── layout.tsx                    # Shell : topbar + sidebar + thème + WS
    ├── login/page.tsx                # Login + 2FA (existant, à conserver)
    ├── page.tsx                      # Dashboard KPIs temps réel
    ├── evenements/
    │   ├── page.tsx                  # Liste
    │   ├── new/page.tsx
    │   └── [id]/
    │       ├── page.tsx              # Config 12 onglets
    │       └── live/page.tsx         # Gestion du live
    ├── participants/page.tsx
    ├── paiements/page.tsx            # Validation paiements manuels
    ├── scan/page.tsx                 # Scanner QR mobile-first
    ├── finances/page.tsx
    ├── equipe/page.tsx               # Super Admin
    ├── communications/page.tsx
    └── activite/page.tsx             # Super Admin
```

**Migrations de routes** (redirects 301 dans `next.config.mjs`) :

| Ancienne route | Nouvelle route |
|---|---|
| `/e/[slug]/acheter?formula=` | `/e/[slug]/acheter/presentiel` ou `/en-ligne` |
| `/paiement/succes` | `/confirmation` |
| `/paiement/attente` + `/paiement/manuel` | `/en-attente` |
| `/paiement/echec` | `/echec` |
| `/mon-billet` | `/billet` |
| `/admin/events*`, `/admin/manual-payments`, `/admin/admins`, `/admin/audit-logs` | `/admin/evenements*`, `/admin/paiements`, `/admin/equipe`, `/admin/activite` |

**Middleware** (`src/middleware.ts`) : next-intl (`localePrefix: 'as-needed'` — FR sans préfixe pour le marché ivoirien, `/en/...` préfixé, cookie `NEXT_LOCALE` persisté) avec matcher excluant `/admin`, `/_next`, fichiers statiques. La protection admin reste gérée par le layout admin (cookie httpOnly vérifié côté API).

---

## 3. Structure des dossiers

```
src/
├── app/                              # (voir §2)
├── components/
│   ├── templates/
│   │   ├── registry.ts               # Mapping 'A'→keynote… + dynamic imports
│   │   ├── types.ts                  # Contrats de props des sections
│   │   ├── keynote/                  # Template A
│   │   │   ├── Hero.tsx  About.tsx  Speakers.tsx  Programme.tsx
│   │   │   ├── Formulas.tsx  Stats.tsx  Faq.tsx  Partners.tsx
│   │   │   └── index.ts              # export des sections du template
│   │   ├── spotlight/                # Template B (même inventaire)
│   │   ├── directors-cut/            # Template C
│   │   └── pulse/                    # Template D (+ MarqueeBand, CustomCursor)
│   ├── shared/                       # Composants publics inter-templates
│   │   ├── Navbar.tsx  Footer.tsx  LangSwitch.tsx
│   │   ├── CountdownBanner.tsx  TicketsCounter.tsx  LiveBadge.tsx
│   │   ├── ThemeInjector.tsx         # <style> variables couleur (RSC)
│   │   └── ScrollReveal.tsx          # Wrapper d'apparition au scroll (léger)
│   ├── purchase/                     # Formulaire d'achat (3 étapes)
│   │   ├── PurchaseForm.tsx  FormulaPicker.tsx  PersonalInfoFields.tsx
│   │   ├── PaymentPicker.tsx  ManualPaymentFlow.tsx  ReceiptUpload.tsx
│   │   ├── OrderRecap.tsx  TurnstileField.tsx
│   │   └── PhoneInput.tsx  CountrySelect.tsx
│   ├── live/
│   │   ├── LivePlayer.tsx            # hls.js lazy
│   │   ├── Watermark.tsx  SubtitlesToggle.tsx  ViewerCount.tsx
│   │   └── LiveStates.tsx            # 5 états (invalide/countdown/live/éjecté/terminé)
│   ├── chatbot/ChatbotWidget.tsx     # Existant, à i18n-iser
│   ├── admin/                        # Composants du dashboard
│   │   ├── shell/ (Topbar, Sidebar, NotificationCenter, ThemeToggle, GlobalSearch)
│   │   ├── dashboard/ (KpiCard, SalesChart, CountryChart, ActivityFeed)
│   │   ├── event-config/ (un fichier par onglet ×12, TabsShell, UnsavedGuard, DesignPreview)
│   │   ├── tables/ (DataTable générique, filtres, pagination)
│   │   └── scan/ (QrScanner, ScanResult, ScanHistory)
│   └── ui/                           # shadcn (existant + ajouts)
├── lib/
│   ├── api/
│   │   ├── client.ts                 # axios public (existant)
│   │   ├── admin-client.ts           # axios withCredentials (existant, renommé)
│   │   ├── events.ts orders.ts tickets.ts live.ts    # fonctions typées publiques
│   │   └── admin/ (stats.ts events.ts participants.ts payments.ts …)
│   ├── i18n/ (routing.ts, request.ts) # config next-intl
│   ├── localized.ts                  # helper l(obj, 'name', locale) avec fallback FR
│   ├── contrast.ts                   # texte auto selon luminance du fond
│   ├── motion/
│   │   ├── useMotionProfile.ts       # 'full' | 'reduced' | 'minimal'
│   │   └── gsap.ts                   # import dynamique + registerPlugin unique
│   ├── ws/useWebSocket.ts            # reconnexion auto (backoff expo)
│   ├── query.tsx utils.ts            # existants
│   └── format.ts                     # formatFCFA, formatEventDate (déplacés)
├── stores/                           # Zustand
│   ├── useAdminUi.ts                 # sidebar repliée, thème, event sélectionné
│   ├── useNotifications.ts           # flux WS admin, non-lus
│   └── useLiveSession.ts             # état player, éjection, viewers
├── types/
│   ├── event-config.ts               # ★ Contrat public complet (§5)
│   ├── order.ts  live.ts  admin.ts
├── messages/
│   ├── fr.json  en.json              # Statiques next-intl
└── middleware.ts
```

Conventions inchangées : composants PascalCase, utilitaires camelCase, hooks `useXxx`, TypeScript strict, zéro `any`.

---

## 4. Système de templates

### 4.1 Contrat de sections

Chaque template exporte le même ensemble de sections. La landing les compose ; un template ne décide jamais *quoi* afficher (c'est la config), seulement *comment*.

```ts
// components/templates/types.ts
export type TemplateKey = 'A' | 'B' | 'C' | 'D';           // valeurs API (enum backend)
export type TemplateName = 'keynote' | 'spotlight' | 'directors-cut' | 'pulse';

export interface TemplateSections {
  Hero: ComponentType<HeroProps>;
  About: ComponentType<AboutProps>;
  Speakers: ComponentType<SpeakersProps>;      // rendu seulement si options.show_speakers
  Programme: ComponentType<ProgrammeProps>;
  Formulas: ComponentType<FormulasProps>;
  Stats: ComponentType<StatsProps>;            // rendu seulement si stats non vides
  Faq: ComponentType<FaqProps>;
  Partners: ComponentType<PartnersProps>;
}
```

Toutes les props de section dérivent de `EventConfig` (§5) + `locale`. Les sections sont des **client components** (animations) mais reçoivent des données déjà fetchées côté serveur — aucune requête dans les templates.

### 4.2 Registry + code-splitting par template

```ts
// components/templates/registry.ts
import dynamic from 'next/dynamic';

const load = (name: TemplateName): TemplateSections => ({
  Hero: dynamic(() => import(`./${name}`).then(m => m.Hero)),
  // … idem pour chaque section
});

export const TEMPLATE_BY_KEY: Record<TemplateKey, TemplateName> = {
  A: 'keynote', B: 'spotlight', C: 'directors-cut', D: 'pulse',
};
export function getTemplate(key: TemplateKey): TemplateSections { … }
```

Un visiteur ne télécharge que le bundle du template actif. GSAP/ScrollTrigger ne sont importés que dans les modules d'animation des templates qui en ont besoin (C, D, et ponctuellement A/B), derrière `useMotionProfile() === 'full'`.

### 4.3 Composition de la landing (RSC)

```tsx
// app/[locale]/e/[slug]/page.tsx  — Server Component
const config = await getEventConfig(slug);            // fetch + ISR (§6.3)
const T = getTemplate(config.design.template);
return (
  <ThemeInjector design={config.design}>
    <Navbar config={config} />
    <T.Hero … />
    {config.options.show_countdown && <CountdownBanner date={config.event.date} />}
    <T.About … />
    {config.options.show_speakers && config.speakers.length > 0 && <T.Speakers … />}
    <T.Programme … />
    <T.Formulas … />                                  {/* CTAs → /acheter/presentiel | /en-ligne */}
    {config.stats.length > 0 && <T.Stats … />}
    <T.Faq … />
    {config.partners.length > 0 && <T.Partners … />}
    <Footer config={config} />
    {config.options.chatbot_enabled && <ChatbotWidget … />}
  </ThemeInjector>
);
```

### 4.4 Identités des 4 templates — rappel d'implémentation

| | A KEYNOTE | B SPOTLIGHT | C DIRECTOR'S CUT | D PULSE |
|---|---|---|---|---|
| Fond | Blanc cassé | Alternance couleur/blanc/noir | Noir + photos | Fort contraste, configurable |
| Titres | Serif (`--font-serif`), letter-spacing large | Sans extra-bold (`--font-display`) blanc | Serif oversize qui déborde | Sans extra-bold, mots positionnés indépendamment |
| Animations clés | Lignes fines qui s'étirent, compteurs, fondus | Wipes 300ms, duotone→couleur au hover, confettis CTA | Fade-to-black, parallaxe, grain `::after` | Mots au scroll (GSAP), marquee, curseur custom, scroll horizontal programme |
| Techno anim | CSS + IntersectionObserver | Framer Motion + canvas-confetti | GSAP timeline + ScrollTrigger | GSAP ScrollTrigger (pin) |
| Spécifique | — | Badge "Populaire" VIP | Citations de respiration | MarqueeBand, CustomCursor (desktop only) |

Le duotone (B, D) et le grayscale (A, C) sont des filtres CSS sur les photos — jamais de retraitement d'image côté serveur.

---

## 5. Contrat de données — `EventConfig`

**Endpoint** : `GET /api/v1/events/{slug}/config` — un seul appel pour toute la landing. C'est le contrat que le backend devra exposer (delta vs l'existant listé en §13).

```ts
// types/event-config.ts — extraits structurants
export interface Bilingual { fr: string; en: string | null }   // en=null → fallback fr

export interface EventConfig {
  event: {
    id: string; slug: string;
    name: Bilingual;
    date: string; start_time: string; end_time: string | null;
    location: string | null; city: string | null;
    mode: 'presentiel' | 'online' | 'hybrid';
    status: 'draft' | 'open' | 'live' | 'closed';
    logo_url: string | null;
  };
  design: {
    template: TemplateKey;                       // 'A' | 'B' | 'C' | 'D'
    colors: {
      primary: string;                           // hex
      secondary: string;
      bg: string;                                // hex résolu (clair/sombre/custom)
      bg_mode: 'light' | 'dark' | 'custom';
      text: string | null;                       // null → auto-contraste frontend
    };
  };
  content: {
    hero_image_url: string;
    hero_video_url: string | null;               // desktop/tablette ; mobile → image
    description: Bilingual;                      // rich text (HTML restreint)
    teaser_video_url: string | null;
    cta_presentiel: Bilingual; cta_online: Bilingual;
  };
  formulas: Array<{
    id: string; name: Bilingual; description: Bilingual;
    advantages: Array<Bilingual>;
    price: number; currency: 'XOF';
    channel: 'presentiel' | 'online' | 'both';
    remaining: number | null;                    // null si compteur désactivé
    is_sold_out: boolean; is_featured: boolean;  // badge "Populaire" (B)
    sort_order: number;
  }>;
  speakers: Array<{ id: string; name: string; title: Bilingual; bio: Bilingual;
                    photo_url: string; sort_order: number }>;
  programme: Array<{ id: string; start_time: string; end_time: string | null;
                     title: Bilingual; description: Bilingual;
                     speaker_ids: string[]; sort_order: number }>;
  stats: Array<{ value: number; suffix: string | null; label: Bilingual }>;
  faqs: Array<{ id: string; question: Bilingual; answer: Bilingual }>;
  partners: Array<{ id: string; name: string; logo_url: string;
                    url: string | null; sort_order: number }>;
  options: {
    show_tickets_counter: boolean; show_countdown: boolean;
    show_speakers: boolean; show_live_qa: boolean;
    digital_enabled: boolean; manual_enabled: boolean;
    chatbot_enabled: boolean;
    marquee_text: Bilingual | null;              // template D
  };
  footer: { about: Bilingual; contact_email: string | null;
            contact_whatsapp: string | null; address: string | null;
            socials: Array<{ kind: 'facebook'|'instagram'|'x'|'linkedin'|'youtube'|'tiktok'; url: string }> };
  support: { service_name: string; whatsapp_number: string };  // chatbot + CTA support
  is_live: boolean;                              // badge navbar EN DIRECT
}
```

**Helper de localisation** (`lib/localized.ts`) :

```ts
export function l(field: Bilingual, locale: Locale): string {
  return locale === 'en' && field.en ? field.en : field.fr;
}
```

---

## 6. Theming & i18n

### 6.1 Variables publiques (par événement)

`ThemeInjector` (RSC) rend un `<style>` inline **avant** le contenu — zéro FOUC, zéro JS :

```tsx
const text = design.colors.text ?? bestTextOn(design.colors.bg);   // lib/contrast.ts (luminance WCAG)
<style>{`:root{--color-primary:${…};--color-secondary:${…};--color-bg:${…};--color-text:${text}}`}</style>
```

Usage dans les templates : `bg-[var(--color-primary)]`, `text-[var(--color-text)]`, jamais de couleur en dur pour un élément dynamique. Les nuances dérivées (hover, overlays) via `color-mix(in srgb, var(--color-primary) 85%, black)` — supporté partout en 2026.

### 6.2 Variables admin (globales, inchangées par événement)

Les tokens shadcn actuels de `globals.css` restent le système admin + primitives de formulaires publiques. Le dark admin (`#0F1117` / surfaces `#1A1D26`) est appliqué par `class="dark"` sur le conteneur du layout admin, persisté en cookie `admin-theme`. Le sélecteur `[data-template='B']` actuel est supprimé (remplacé par §6.1).

### 6.3 Data fetching public

- `getEventConfig(slug)` : `fetch` natif côté RSC avec `next: { revalidate: 60, tags: ['event:'+slug] }`.
- Route handler `POST /api/revalidate` (secret partagé) que le backend appelle après chaque sauvegarde CMS → `revalidateTag('event:'+slug)`. La modif admin est visible en < 2s sans sacrifier le cache.
- Données volatiles (places restantes au moment du paiement, statut live) : React Query côté client par-dessus le socle SSR.

### 6.4 next-intl

- `messages/fr.json` + `messages/en.json` pour tout le statique public (labels, erreurs, boutons).
- Contenu dynamique : champs `Bilingual` + helper `l()` — pas de duplication dans les messages.
- `LangSwitch` : bascule le préfixe d'URL, cookie persisté, contenu dynamique re-rendu avec la même config (aucun refetch nécessaire).
- Admin : chaînes FR littérales, pas de next-intl.

### 6.5 Fonts (next/font, self-hosted)

| Variable | Font | Usage |
|---|---|---|
| `--font-sans` | Inter | Corps partout, admin |
| `--font-serif` | Playfair Display | Titres A, C |
| `--font-display` | Archivo (Black/ExtraBold) | Titres massifs B, D, marquee |

---

## 7. Progressive enhancement & animations

```ts
// lib/motion/useMotionProfile.ts
// 'minimal'  : prefers-reduced-motion, ou mobile (<768px)
// 'reduced'  : tablette / pointeur tactile (maxTouchPoints > 0)
// 'full'     : desktop pointeur fin
```

Règles d'application (CDC §1.6) :

| Capacité | full | reduced | minimal |
|---|---|---|---|
| GSAP ScrollTrigger (C/D) | ✔ complet | simplifié (fondus) | désactivé |
| Curseur custom (D) | ✔ | ✘ | ✘ |
| Scroll horizontal programme (B/D) | ✔ (pin) | swipe natif | liste verticale |
| Parallaxe (C) | ✔ | réduite | ✘ |
| Hover duotone/tilt | ✔ | ✘ | ✘ |
| Vidéo hero autoplay | ✔ muette | ✔ muette | image statique |
| Marquee (D) | ✔ | ✔ | ✔ vitesse réduite |

- SSR rend toujours l'état **sans animation** (contenu visible) ; les animations s'attachent au mount si le profil le permet → pas de mismatch d'hydratation, pas de page blanche sans JS.
- `lib/motion/gsap.ts` : unique point d'import dynamique de GSAP (`import('gsap')`), plugin registration centralisée — GSAP n'apparaît jamais dans le bundle initial.
- Budget perf : landing initiale < 170 KB JS gzip hors template, chaque template < 60 KB, GSAP chargé à la demande.

---

## 8. Pages d'achat (`/e/[slug]/acheter/{presentiel|en-ligne}`)

Structure : RSC qui fetch la config → `<PurchaseForm channel="presentiel" config={…}>` (client).

- **3 étapes visibles simultanément** (pas de stepper) : FormulaPicker (cards radio ; en-ligne = carte unique présélectionnée) → PersonalInfoFields → PaymentPicker.
- **react-hook-form + zod** (déjà en place) ; validation temps réel, messages localisés via next-intl.
- **PhoneInput** : sélecteur d'indicatif avec drapeaux (dataset local ~240 entrées, pas de lib lourde). **CountrySelect** : dropdown avec recherche (shadcn Command).
- **PaymentPicker** : deux groupes conditionnés par `options.digital_enabled` / `manual_enabled`. Digital : Wave / Orange Money / MTN / Carte (identifiants génériques `wave|orange_money|mtn|card` — PayDunya derrière). Manuel : WU / RIA / MoneyGram / Autre.
- **TurnstileField** avant le CTA (`@marsidev/react-turnstile`), token joint au `POST /orders`.
- **OrderRecap** sticky (desktop) / bas de page (mobile), branché sur `watch()` RHF.
- **Soumission digitale** : `POST /orders` → `{ payment_url }` → redirection PayDunya. Retours : `/confirmation?ref=` | `/echec?ref=`.
- **Soumission manuelle** : `POST /orders` → instructions (depuis `payment_config`) + `ReceiptUpload` (2 boutons : `capture="environment"` caméra / galerie ; JPEG/PNG ≤ 5 Mo, aperçu miniature) → `POST /orders/{id}/manual-payment` → `/en-attente?ref=`.
- **États page** : normal / loading / erreurs champ / erreur serveur (toast) / billetterie fermée (`status !== 'open'` → message + retour).

`/confirmation` : ✓ animée (stroke-dasharray), QR en aperçu si présentiel (fourni par l'API `GET /orders/{ref}/public`), message "lien 2h avant" si online, lien vers `/billet`.
`/en-attente` : sablier Lottie, référence, CTA WhatsApp support.
`/billet` : email + n° commande → `POST /tickets/resend` (géré rate-limit 429 → message dédié).

---

## 9. Page live (`/[locale]/live?token=`)

Design neutre sombre, aucun template. Machine à 5 états pilotée par `GET /live/session?token=` + WS `/ws/live/{token}` :

`invalid` → message + support · `waiting` → countdown auto-refresh · `playing` → player · `ejected` → overlay plein écran · `ended` → merci + replay éventuel.

- **LivePlayer** : `hls.js` en import dynamique (Safari iOS : HLS natif en fallback), 720p fixe, contrôles natifs.
- **Watermark** : div absolute `pointer-events-none`, nom/email du viewer, repositionnée toutes les 30 s (positions pseudo-aléatoires bornées dans le cadre).
- **Sous-titres** : pistes WebVTT FR/EN, toggle CC.
- **Session unique** : le WS notifie l'éjection → état `ejected` (overlay "Session ouverte sur un autre appareil"). Reconnexion WS : backoff expo + jitter, toast "Connexion perdue…".
- Clic droit désactivé sur le conteneur player (cosmétique, comme spécifié).
- **Q&A optionnel** (`options.show_live_qa`) : flux de questions + upvote, via le même WS.

---

## 10. Dashboard admin

### 10.1 Shell

- **Topbar** : logo, recherche globale (Command palette — participants/commandes/événements), cloche notifications (badge non-lus), toggle dark/light, avatar+menu.
- **Sidebar** rétractable (icônes seules en mode replié), sections filtrées par rôle :

| Section | Super Admin | Manager | Comptable | Agent |
|---|---|---|---|---|
| Dashboard | ✔ | ✔ | ✔ | ✘ |
| Événements / Communications / Participants | ✔ | ✔ | ✘ | ✘ |
| Paiements | ✔ | ✔ | ✔ | ✘ |
| Scan | ✔ | ✘ | ✘ | ✔ (page unique) |
| Finances | ✔ | ✘ | ✔ | ✘ |
| Équipe / Activité | ✔ | ✘ | ✘ | ✘ |

Le rôle vient de `GET /auth/me` (contexte auth existant). Garde double : sidebar masquée + redirect si accès direct URL. L'API reste l'autorité.

- **Notifications** : `useWebSocket('/ws/admin/notifications')` → store Zustand → toasts sonner (urgents) + panneau latéral chronologique lu/non-lu.

### 10.2 Dashboard principal

KPI cards extensibles (billets, scans, revenus, viewers live si `is_live`, manuels en attente avec badge orange) + Recharts (barres ventes/formule, barres pays, ligne évolution, période 7j/30j/tout) + flux activité (10 dernières, WS). Sélecteur d'événement en topbar (store `useAdminUi`, persisté).

### 10.3 Config événement — 12 onglets

`TabsShell` générique : chaque onglet est un formulaire RHF isolé avec son `PATCH`, indicateur point orange si dirty (`formState.isDirty`), `UnsavedGuard` (confirmation avant navigation).

| Onglet | Composants clés |
|---|---|
| Général | Champs simples + slug (validation unicité) + statut |
| Formules | CRUD table + drawer d'édition, avantages répétables FR/EN, drag-order |
| Contenu (CMS) | `BilingualField` (onglets FR/EN par champ), éditeur rich text léger (**Tiptap** : bold/italic/liens/listes), `ImageDropzone` (drag-drop + aperçu + progression) |
| Speakers / Programme / Partenaires / Chatbot / Groupes WhatsApp | Même pattern CRUD + tri |
| Design | Sélecteur template (4 vignettes), color pickers, **DesignPreview** (§10.4), bouton plein écran |
| Paiement | Toggles digital/manuel + config bénéficiaire/devises/instructions FR-EN |
| Automations | Table des déclencheurs (J-7…J+7) : toggle, canal, offset |
| Options | Les 8 toggles + marquee FR/EN |

### 10.4 Aperçu Design temps réel

**Iframe** `/{slug}?preview=1` (recommandé) : la landing réelle en miniature (`transform: scale(0.28)`), qui écoute `postMessage` `{ template, colors }` et surcharge ses CSS variables + template à la volée sans sauvegarde. Fidélité maximale (vraies sections, vraies données), coût marginal — la page existe déjà. `preview=1` désactive l'ISR et le tracking.

### 10.5 Scan / Participants / Paiements / Finances / Équipe / Communications / Activité

Conformes au CDC §5.8–5.14. Points d'implémentation :

- **Scan** : `html5-qrcode` (existant), scan continu, verrou 3 s anti-double-lecture, `navigator.vibrate`, sons validé/refusé (2 fichiers audio, préchargés), fond vert/rouge plein écran, 20 derniers scans en dessous.
- **DataTable générique** (participants, transactions, activité) : tri serveur, filtres combinables synchronisés dans l'URL (`?formula=&country=&status=&page=`), pagination 20/50, sélection multiple, panneau latéral fiche participant (Sheet).
- **Exports** : simple `<a href={apiUrl}/admin/participants/export?format=xlsx&…>` — génération backend, aucune lib front.
- **Paiements** : cartes en attente, lightbox reçu (zoom), valider (confirm) / rejeter (motif obligatoire).
- **Communications** : filtres segment → compteur destinataires live (debounce), canaux, aperçu, confirmation avec total.

---

## 11. Dépendances à ajouter

```
next-intl  framer-motion  gsap  hls.js  zustand  recharts
canvas-confetti (@types/canvas-confetti)  lottie-react
@marsidev/react-turnstile
@tiptap/react @tiptap/starter-kit          # rich text CMS admin
shadcn à générer : table tabs dropdown-menu sheet switch popover command avatar tooltip progress
```

Installation groupée au Lot 0 (une PR socle), sauf Tiptap (Lot 7 — admin CMS). React Three Fiber : **hors scope** tant qu'aucun template ne l'exige.

`next.config.mjs` : `images.remotePatterns` pour l'origine backend (dev `localhost:8000`, prod `farahevent.tech`) — les uploads passent par `next/image`.

---

## 12. Plan de construction par lots

Priorité client : **billetterie d'abord** (Lots 0→3), streaming ensuite.

| Lot | Contenu | Livrable vérifiable |
|---|---|---|
| **0 — Socle** | Deps, arbo §3, middleware i18n, redirects, fonts, split theming public/admin, `EventConfig` + fixture mock (`NEXT_PUBLIC_USE_MOCK=1`), `l()`, `useMotionProfile`, `ThemeInjector` | `npm run typecheck` + landing existante toujours fonctionnelle sous `/[locale]` |
| **1 — Partagés publics** | Navbar (transparente→opaque, burger, badge live), Footer, LangSwitch, Countdown, TicketsCounter, Chatbot i18n | Visibles sur la landing mock FR/EN |
| **2 — Template A + landing RSC** | 8 sections KEYNOTE, composition §4.3, 404 stylée, OG image | Landing A complète Lighthouse mobile > 80 |
| **3 — Tunnel d'achat** | Pages presentiel/en-ligne, PurchaseForm complet, Turnstile, manuel + upload, confirmation/en-attente/echec/billet | Parcours digital (stub) et manuel de bout en bout |
| **4 — Template B** | 8 sections SPOTLIGHT (wipes, duotone, carousel, confettis) | Switch A↔B sans re-saisie |
| **5 — Live** | 5 états, player, watermark, WS session unique, sous-titres | Éjection 2ᵉ connexion démontrée |
| **6 — Admin shell + dashboard** | Refonte layout (topbar/sidebar/rôles/dark), KPIs, charts, notifications WS, renommage routes | 4 rôles → 4 vues distinctes |
| **7 — Config événement (CMS)** | 12 onglets + preview iframe + revalidation | Modif CMS visible sur la landing < 2 s |
| **8 — Opérations admin** | Participants, Paiements, Scan (refonte), Finances, Équipe, Communications, Activité | Validation manuelle → billet ; scan mobile OK |
| **9 — Templates C & D** | DIRECTOR'S CUT + PULSE (grain, fade-to-black, marquee, curseur, scroll horizontal) | 4 templates switchables |
| **10 — Durcissement** | Lighthouse, a11y, QA 3 breakpoints × 4 templates, états d'erreur, revue sécurité front | Grille de recette CDC cochée |

---

## 13. Delta API attendu côté backend (pour synchro)

Le frontend consommera ces endpoints ; à créer/étendre côté FastAPI :

1. `GET /events/{slug}/config` — agrégat `EventConfig` complet (§5) avec champs bilingues. **Le plus structurant.**
2. `GET /orders/{ref}/public` — récap commande + QR (page confirmation, sans auth).
3. `POST /tickets/resend` — existe ? vérifier rate limit + réponse 429 exploitable.
4. `GET /live/session?token=` + WS `/ws/live/{token}` — états + éjection.
5. WS `/ws/admin/notifications` + `/ws/admin/viewers`.
6. `GET /admin/stats?event_id=&period=` — KPIs + séries pour Recharts.
7. Endpoints CMS par onglet (`PATCH /admin/events/{id}/content|design|options|…`) + upload images.
8. `POST /admin/*/export` → fichiers générés backend.
9. Hook de revalidation : le backend appelle `POST {front}/api/revalidate` après sauvegarde CMS.

Champs bilingues : convention `*_fr` / `*_en` en BDD, agrégés en `{ fr, en }` dans le config publique.

---

## 14. Décisions actées / restant ouvertes

**Actées** (dans ce document) :
- Multi-événements par slug ; routes CDC relatives à l'événement.
- PayDunya + OpenWA ; frontend provider-agnostic.
- Auth admin cookie httpOnly (existant conservé).
- Preview Design = iframe postMessage.
- i18n `as-needed` (FR sans préfixe).
- Installation deps groupée au Lot 0.

**Ouvertes** (à trancher avant le lot concerné) :
- Ordre exact C vs D au Lot 9 (D est le plus coûteux).
- Choix final de la font display (Archivo proposé ; alternative Anton si le client veut plus condensé).
- Turnstile : clés + activation côté backend (sinon champ masqué derrière un flag env en dev).
- Q&A live : inclus au Lot 5 ou différé (dépend du backend WS).

---

*— Fin du document de conception —*
