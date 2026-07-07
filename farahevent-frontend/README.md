# FarahEvent — Frontend Next.js

Frontend public + admin (Sprint 6a livré : parcours acheteur public).

## Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** + composants shadcn/ui (inline dans `src/components/ui/`)
- **TanStack Query 5** — data fetching + polling paiement
- **react-hook-form + zod** — validation formulaire d'achat
- **axios** — client HTTP
- **sonner** — toasts

## Démarrer

```bash
cd farahevent-frontend
cp .env.local.example .env.local        # ajuster NEXT_PUBLIC_API_URL si besoin
npm install
npm run dev                             # http://localhost:3000
```

Prérequis : le backend FastAPI tourne sur `http://localhost:8000` (défaut).

## Pages livrées (Sprint 6a)

| Route | Rôle |
|---|---|
| `/` | Racine — redirect si un seul event actif, sinon liste |
| `/e/[slug]` | Détail événement + formules disponibles (respecte le template A/B) |
| `/e/[slug]/acheter` | Formulaire d'achat complet + choix moyen paiement |
| `/paiement/attente?order_id=...` | Polling status order (5s) |
| `/paiement/manuel?order_id=...` | Upload preuve paiement multipart |
| `/paiement/succes?order_id=...` | Confirmation |
| `/paiement/echec?reason=...` | Échec (FAILED / REJECTED) |
| `/mon-billet` | Re-livraison billet (email + order_id) |

## Templates A / B

Le CSS de `src/app/globals.css` définit deux palettes :
- Template A = sobre corporate (défaut)
- Template B = dynamique festif — activé quand un ancêtre porte `data-template="B"`

`<ThemeWrapper template={event.template}>` applique la variante depuis la valeur renvoyée par l'API pour chaque événement.

## Structure

```
src/
├── app/                      Routes App Router
├── components/
│   ├── theme/ThemeWrapper.tsx  Wrapper qui applique data-template
│   └── ui/                     shadcn primitives (button, card, input...)
├── lib/
│   ├── api.ts                axios client + helper toApiError
│   ├── query.tsx             TanStack QueryClientProvider
│   └── utils.ts              cn (Tailwind merge) + formatFCFA / formatEventDate
└── types/                    Types miroirs des schemas backend
```

## Flow acheteur (end-to-end)

1. `/` → liste des events (ou redirect si un seul)
2. `/e/[slug]` → clique sur une formule
3. `/e/[slug]/acheter?formula=xxx` → remplit ses infos + choisit `digital` ou `manual`
4. Soumission → `POST /orders/` :
   - `digital` → redirect `checkout_url` (Sprint 5 branchera PayDunya réel — stub renvoie `/paiement/attente`)
   - `manual` → redirect `/paiement/manuel?order_id=xxx`
5. Sur `/paiement/manuel` → upload photo du reçu → `POST /orders/{id}/manual-payment`
6. `/paiement/attente?order_id=xxx` → polling 5s de `GET /orders/{id}`
7. Sur `PAID` / `MANUAL_VALIDATED` → redirect `/paiement/succes`
8. Sur `FAILED` / `REJECTED` → redirect `/paiement/echec`

## Ce qui reste (hors Sprint 6a)

- **Sprint 6b** — Dashboard admin : login (avec 2FA), CRUD events/formulas/CMS/manual_payments, gestion collaborateurs
- **Sprint 6c** — Scanner QR mobile (`/admin/scan` avec html5-qrcode)
- **Sprint 6d** — Chatbot widget (flottant, FAQ + escalade WhatsApp)
