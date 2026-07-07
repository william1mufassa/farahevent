# FarahEvent — Rapport de reprise de session

> **Date** : 6 juillet 2026 (mis a jour apres Sprint 6b+6c)
> **Objectif** : Permettre à un développeur de reprendre le travail proprement dans une nouvelle session.

---

## 1. Contexte projet

**FarahEvent** est une plateforme de billetterie hybride (présentiel + online) pour un client en **Côte d'Ivoire**. Le domaine est `farahevent.tech`.

### Deux développeurs

| Périmètre | Qui | Phases |
|---|---|---|
| Backend core, QR, frontend, dashboard, tests | **Toi (Williams)** | 2, 4, 7, 8, 9 |
| Infra, paiements provider, streaming, communications | **Collaborateur** | 0, 1, 3, 5, 6 |
| Déploiement | **Ensemble** | 10 |

### Priorité actuelle

Le client a demandé de **prioriser la billetterie** par rapport au streaming. Les acheteurs doivent pouvoir payer et recevoir leurs billets. Le streaming (Phase 5 collabo) sera prêt avant le jour J de l'événement.

---

## 2. Stack technique

### Backend (`farahevent-backend/`)

| Composant | Technologie |
|---|---|
| Framework | FastAPI 0.111.0 |
| ORM | SQLAlchemy 2.0.30 (async, AsyncPG 0.29) |
| BDD | PostgreSQL 16 |
| Migrations | Alembic 1.13.1 (driver sync : psycopg2-binary) |
| Auth | JWT HS256 (python-jose), passlib + bcrypt==4.0.1 |
| 2FA | pyotp 2.9.0 (TOTP) |
| QR Codes | qrcode + Pillow, JWT-signed tokens |
| Cache | Redis 5.0.4 |
| Upload | python-multipart, validation MIME + magic bytes |

**IMPORTANT** : `passlib 1.7.4` est incompatible avec `bcrypt >= 4.1` — le pin `bcrypt==4.0.1` dans `requirements.txt` est **volontaire et obligatoire**.

### Frontend (`farahevent-frontend/`)

| Composant | Technologie |
|---|---|
| Framework | Next.js 14.2.15 (App Router) |
| UI | Tailwind CSS 3.4 + shadcn/ui (inline) |
| Data | TanStack Query 5 |
| Forms | react-hook-form 7 + zod 3 |
| HTTP | axios |
| Toasts | sonner |
| Icônes | lucide-react |
| QR Scanner | html5-qrcode 2.3.8 (Sprint 6c) |

### Services tiers

| Service | Statut |
|---|---|
| **PayDunya** (paiement digital) | Compte en cours d'activation — `StubPaymentProvider` en attendant |
| **OpenWA** (WhatsApp) | Choisi comme solution unique (pas Evolution API) |
| **Brevo** (email transactionnel) | Sprint 6 collabo — pas encore branché |
| **BunnyCDN** (streaming vidéo) | Phase 5 — pas prioritaire |

### Infra cible

- 2 VPS (app + streaming)
- Docker Compose + Nginx reverse proxy
- Redis
- PostgreSQL 16

---

## 3. Architecture backend — fichiers clés

```
farahevent-backend/
├── alembic/
│   ├── env.py                         # Utilise DATABASE_URL_SYNC (psycopg2)
│   └── versions/
│       └── 20260705_2130_0001_initial_schema.py  # 14 tables, hand-written
├── scripts/
│   └── create_super_admin.py          # CLI : python -m scripts.create_super_admin
├── app/
│   ├── main.py                        # FastAPI app, CORS, /health, lifespan
│   ├── core/
│   │   ├── config.py                  # Settings (pydantic-settings, .env)
│   │   ├── database.py                # async engine, get_db() avec commit/rollback
│   │   └── security.py               # hash/verify pwd, JWT, get_current_admin, require_roles
│   ├── models/
│   │   ├── __init__.py                # Import centralisé des 14 modèles
│   │   ├── enums.py                   # 13 enums métier (voir section 4)
│   │   ├── admin.py                   # 4 rôles, TOTP 2FA, last_login_at
│   │   ├── participant.py             # Acheteur anonyme (email, whatsapp, country)
│   │   ├── event.py                   # slug unique, mode, status, template A/B, soft delete
│   │   ├── formula.py                 # Remplace TicketCategory — channel, advantages, sold_quantity
│   │   ├── order.py                   # Provider-agnostic, 7 statuts, JSONB metadata_
│   │   ├── ticket.py                  # type qr/live_link, qr_token JWT, is_scanned
│   │   ├── manual_payment.py          # 1:1 order, operator WU/RIA/MG, receipt upload
│   │   ├── payment_config.py          # 1:1 event, FCFA/EUR/USD, toggle digital/manual
│   │   ├── event_content.py           # CMS key/value par event
│   │   ├── whatsapp_group.py          # Groupes WA avec capacité max 900
│   │   ├── chatbot_faq.py             # FAQ chatbot par event
│   │   ├── email_automation.py        # Automations email par trigger
│   │   ├── scan_log.py                # Logs de scan QR
│   │   └── audit_log.py               # Logs d'audit admin
│   ├── schemas/
│   │   ├── admin.py                   # Pydantic schemas admin CRUD
│   │   ├── event.py                   # Schemas event public
│   │   ├── event_admin.py             # Schemas event admin (create/update/status)
│   │   ├── order.py                   # OrderCreate, OrderPublicStatus
│   │   ├── participant.py             # ParticipantInfo
│   │   ├── ticket.py                  # ScanRequest, ScanResponse
│   │   └── manual_payment.py          # ManualPaymentValidation
│   ├── services/
│   │   ├── payment_provider.py        # Interface abstraite + StubPaymentProvider
│   │   ├── ticket_service.py          # generate_for_order() — idempotent
│   │   ├── qr_service.py             # encode/decode JWT QR, render PNG base64
│   │   ├── upload_service.py          # Validation MIME + magic bytes + stockage
│   │   ├── audit_service.py           # Écriture audit_logs
│   │   ├── two_factor_service.py      # pyotp wrapper (generate, verify, provisioning URI)
│   │   └── whatsapp_service.py        # Client OpenWA (stub)
│   └── api/v1/
│       ├── router.py                  # Câblage de tous les endpoints
│       └── endpoints/
│           ├── events.py              # GET /events/ (public, open/live/closed)
│           ├── orders.py              # POST /orders/, GET /orders/{id}, POST manual-payment
│           ├── tickets.py             # POST /scan (FOR UPDATE), GET /{id}/qr, POST /resend
│           ├── payments.py            # (placeholder Sprint 5)
│           ├── webhooks.py            # (placeholder Sprint 5)
│           ├── auth.py                # POST /admin/auth/login (avec OTP), POST /refresh
│           └── admin/
│               ├── admins.py          # CRUD collaborateurs (super_admin only)
│               ├── two_factor.py      # Setup / verify / disable 2FA
│               ├── events.py          # CRUD events + status transitions + soft delete
│               ├── formulas.py        # CRUD formules scoped by event
│               ├── cms.py             # Bulk upsert event_content
│               ├── payment_config.py  # Upsert config paiement
│               ├── whatsapp_groups.py # CRUD + pick_next_group (FOR UPDATE)
│               ├── chatbot_faqs.py    # CRUD FAQ
│               ├── email_automations.py # CRUD automations
│               └── manual_payments.py # List + validate (→ ticket_service) + reject
```

---

## 4. Modèle de données — 14 tables

### Enums métier (`app/models/enums.py`)

| Enum | Valeurs |
|---|---|
| `AdminRole` | super_admin, manager, agent, comptable |
| `EventMode` | presentiel, online, hybrid |
| `EventStatus` | draft, open, live, closed |
| `EventTemplate` | A, B |
| `FormulaChannel` | presentiel, online, both |
| `OrderStatus` | PENDING, PAID, FAILED, MANUAL_PENDING, MANUAL_VALIDATED, REJECTED, REFUNDED |
| `PaymentProvider` | paydunya, manual |
| `ManualPaymentOperator` | western_union, ria, moneygram, other |
| `ManualPaymentStatus` | pending, validated, rejected |
| `TicketType` | qr, live_link |
| `TicketDeliveryPref` | email, whatsapp, both |
| `ScanResult` | valid, invalid, duplicate |
| `EmailTrigger` | payment_confirmed, manual_validated, manual_rejected, j_minus_7, j_minus_3, j_minus_1, h_minus_2, h_minus_0_5, j_plus_1, j_plus_7 |

### Relations clés

```
Event 1──N Formula
Event 1──1 PaymentConfig
Event 1──N Order
Event 1──N EventContent (CMS)
Event 1──N WhatsappGroup
Event 1──N ChatbotFaq
Event 1──N EmailAutomation

Order N──1 Event
Order N──1 Formula
Order N──1 Participant (upsert par email par event)
Order 1──1 ManualPayment (si paiement manuel)
Order 1──N Ticket

Ticket N──1 Participant
Ticket N──1 Event
Ticket N──1 Formula

Admin 1──N AuditLog
Admin 1──N ScanLog (via tickets.scanned_by)
```

### Décisions de design

- **Achat anonyme** : pas de compte acheteur. Le Participant est identifié par email, upsert par event.
- **Provider-agnostic** : `order.payment_provider`, `order.payment_provider_ref`, `order.payment_provider_checkout_id` — fonctionne avec n'importe quel provider.
- **QR JWT-signed** : claims `{sub, evt, frm, pn, iat, type="qr_ticket"}`, signé HS256 avec `SECRET_KEY`.
- **Scan concurrent** : `SELECT FOR UPDATE` sur le ticket pour empêcher deux agents de scanner le même QR.
- **Idempotent ticket gen** : `ticket_service.generate_for_order()` vérifie les tickets existants avant de générer.
- **Templates A/B** : CSS variables avec `[data-template='B']` — pas de JS pour le switch.

---

## 5. Architecture frontend — fichiers clés

```
farahevent-frontend/
├── package.json
├── next.config.mjs          # Rewrite /api/* → backend en dev
├── tailwind.config.ts       # Config shadcn/ui compatible
├── src/
│   ├── app/
│   │   ├── globals.css      # Template A (corporate) + Template B (festif)
│   │   ├── layout.tsx       # QueryProvider + Toaster (sonner)
│   │   ├── page.tsx         # Liste events / redirect si un seul
│   │   ├── e/[slug]/
│   │   │   ├── page.tsx     # Détail event + formules
│   │   │   └── acheter/
│   │   │       └── page.tsx # Formulaire d'achat complet
│   │   ├── paiement/
│   │   │   ├── attente/page.tsx  # Polling 5s
│   │   │   ├── manuel/page.tsx   # Upload reçu multipart
│   │   │   ├── succes/page.tsx   # Confirmation
│   │   │   └── echec/page.tsx    # Échec contextualisé
│   │   ├── mon-billet/page.tsx   # Re-livraison (email + order_id)
│   │   └── admin/               # (Sprint 6b + 6c)
│   │       ├── layout.tsx       # AuthProvider + Sidebar + auth guard
│   │       ├── page.tsx         # Dashboard home (stats + raccourcis)
│   │       ├── login/page.tsx   # Login admin avec support 2FA (HTTP 202)
│   │       ├── events/
│   │       │   ├── page.tsx     # Liste events (search, soft delete)
│   │       │   ├── new/page.tsx # Création event (auto-slug)
│   │       │   └── [id]/page.tsx # Détail event — 4 onglets :
│   │       │                      #   Details (edit + transitions statut)
│   │       │                      #   Formules (CRUD inline)
│   │       │                      #   CMS (key/value editor)
│   │       │                      #   Paiement (config digital/manual)
│   │       ├── manual-payments/
│   │       │   └── page.tsx     # Liste filtrable + valider/rejeter
│   │       ├── admins/
│   │       │   └── page.tsx     # CRUD collaborateurs (super_admin only)
│   │       ├── audit-logs/
│   │       │   └── page.tsx     # Journal d'audit (super_admin, filtres action/ressource)
│   │       ├── 2fa/
│   │       │   └── page.tsx     # Setup / disable 2FA (QR TOTP)
│   │       └── scan/
│   │           └── page.tsx     # Scanner QR (caméra + saisie manuelle)
│   ├── components/
│   │   ├── theme/ThemeWrapper.tsx  # data-template A/B
│   │   ├── admin/Sidebar.tsx      # Sidebar navigation admin (rôle-aware)
│   │   ├── chatbot/ChatbotWidget.tsx # Widget flottant public (FAQ + WA escalation)
│   │   └── ui/                     # 9 composants shadcn inline
│   ├── contexts/
│   │   └── auth.tsx              # AuthProvider + useAuth hook (JWT localStorage)
│   ├── lib/
│   │   ├── api.ts           # axios public (sans auth)
│   │   ├── admin-api.ts     # axios admin (auto Bearer, auto refresh 401)
│   │   ├── query.tsx        # QueryClientProvider (staleTime 30s)
│   │   └── utils.ts         # cn(), formatFCFA(), formatEventDate()
│   └── types/
│       ├── event.ts         # EventPublic, FormulaPublic, PaymentConfigPublic
│       ├── order.ts         # OrderPublicStatus
│       └── admin.ts         # AdminInfo, EventAdmin, FormulaAdmin, ManualPaymentAdmin, ScanResponse, PaymentConfigAdmin
```

### Flow acheteur (pages Sprint 6a)

```
/  →  /e/[slug]  →  /e/[slug]/acheter
                         │
           ┌─────────────┼─────────────┐
           ▼             │             ▼
     digital             │         manual
  checkout_url           │    /paiement/manuel
           │             │         (upload reçu)
           ▼             │             │
  /paiement/attente ◄────┘─────────────┘
     (polling 5s)
           │
     ┌─────┴─────┐
     ▼           ▼
  PAID/       FAILED/
  VALIDATED   REJECTED
     │           │
     ▼           ▼
  /paiement/  /paiement/
  succes      echec
```

---

## 6. État des sprints

| Sprint | Contenu | Statut | Responsable |
|---|---|---|---|
| **Sprint 1** | Refonte modèles SQLAlchemy (14 tables), enums, migration Alembic initiale | **TERMINÉ** | Toi |
| **Sprint 2** | Services (payment_provider, ticket_service, qr_service, upload, audit, 2fa), schemas Pydantic | **TERMINÉ** | Toi |
| **Sprint 3** | Endpoints publics (events, orders, tickets, payments, webhooks) | **TERMINÉ** | Toi |
| **Sprint 4** | Endpoints admin (auth+2FA, CRUD events/formulas/CMS/config/WA/FAQ/automations, manual_payments, admins) | **TERMINÉ** | Toi |
| **Sprint 5** | PayDunyaProvider + webhook HMAC + rate limiting + CAPTCHA Turnstile | **EN ATTENTE** | Collabo |
| **Sprint 6a** | Frontend public Next.js (8 pages, parcours acheteur complet) | **TERMINÉ** | Toi |
| **Sprint 6b** | Dashboard admin (login+2FA, CRUD events/CMS/manual_payments, collaborateurs) | **TERMINÉ** | Toi |
| **Sprint 6c** | Scanner QR mobile web (`/admin/scan` avec html5-qrcode) | **TERMINÉ** | Toi |
| **Sprint 6d** | Chatbot widget (FAQ + escalade WhatsApp) | **TERMINÉ** | Toi |
| **Sprint 6-bonus** | 2FA admin page, audit logs, WA groups + FAQ CRUD dans event detail | **TERMINÉ** | Toi |
| **Sprint 7** | Tests E2E billetterie | **À FAIRE** | Toi |

---

## 7. Ce que le collabo doit faire (Sprint 5)

1. **Implémenter `PayDunyaProvider(PaymentProvider)`** dans `app/services/payment_provider.py`
   - Remplacer `payment_provider = StubPaymentProvider()` par `payment_provider = PayDunyaProvider()`
   - Respecter l'interface : `create_checkout()` et `get_status()`
   - Le checkout URL réel remplacera le stub automatiquement

2. **Implémenter le webhook** `POST /webhooks/paydunya`
   - Vérifier la signature HMAC PayDunya
   - Sur paiement confirmé → mettre order.status = PAID → appeler `ticket_service.generate_for_order(order, db)`
   - Le stub est dans `app/api/v1/endpoints/webhooks.py`

3. **Rate limiting** (`slowapi`) sur les endpoints publics

4. **CAPTCHA Turnstile** sur `POST /orders/`

5. **Brevo** (email transactionnel) — câbler les envois de tickets par email

---

## 8. Variables d'environnement

Voir `.env.example` pour la liste complète. Points critiques :

```bash
# Deux URLs BDD : async (app) + sync (Alembic)
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/farahevent
DATABASE_URL_SYNC=postgresql+psycopg2://user:pass@localhost:5432/farahevent

# Secret pour JWT auth ET QR tickets — CHANGER EN PROD
SECRET_KEY=change-this-secret-key-minimum-32-characters

# PayDunya — vide tant que le compte n'est pas activé
PAYDUNYA_MASTER_KEY=
PAYDUNYA_PRIVATE_KEY=

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1  # dans farahevent-frontend/.env.local
```

---

## 9. Comment démarrer en local

### Backend

```bash
cd farahevent-backend
cp .env.example .env        # ajuster les credentials PostgreSQL
pip install -r requirements.txt
# Créer la BDD PostgreSQL "farahevent" si pas encore fait
alembic upgrade head
python -m scripts.create_super_admin admin@farahevent.tech motdepasse Admin Admin
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd farahevent-frontend
cp .env.local.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

### Prérequis système

- Python 3.11+ (testé 3.13)
- Node.js 18+
- PostgreSQL 16
- Redis (optionnel en dev, requis en prod)

---

## 10. Pièges connus

| Piège | Détail |
|---|---|
| **bcrypt pin** | `bcrypt==4.0.1` obligatoire — passlib 1.7.4 crashe avec bcrypt >= 4.1 |
| **Pas de venv système** | Le Python système n'a pas les deps installées — toujours travailler dans un venv |
| **Paths Windows** | Bash utilise `/c/Users/...` mais Python veut `C:\Users\...` — attention aux scripts |
| **Encoding console** | Ajouter `PYTHONIOENCODING=utf-8` si des caractères Unicode posent problème |
| **Alembic sync** | Alembic utilise `DATABASE_URL_SYNC` (psycopg2), pas l'URL async |
| **Pas de `create_all`** | L'app n'utilise PAS `Base.metadata.create_all()` — tout passe par Alembic |
| **CORS dev** | Le frontend Next.js proxifie `/api/*` via rewrite en dev, mais les appels directs à `:8000` depuis le navigateur nécessitent les bons CORS origins |

---

## 11. Prochaines étapes recommandées

### Câblage envoi effectif du billet (débloque la démo end-to-end)
Dans `manual_payments.validate_manual_payment()` (backend) : après `ticket_service.generate_for_order()`, boucler sur les tickets et appeler `whatsapp_service.send_ticket_confirmation()` (service déjà implémenté) + email Brevo.
**Sans ça, l'acheteur ne reçoit pas son billet.**

### Sprint 7 : Tests E2E billetterie
- Bloqué par Sprint 5 (PayDunya) pour le test du flow digital complet
- Le flow manuel peut être testé dès maintenant end-to-end

### Smoke test immédiat recommandé
Avant d'avancer sur 6d/7, valider le parcours complet :
1. `POST /admin/auth/login` → récupérer le JWT
2. Créer un event + formule + payment_config via admin
3. Passer l'event en status `open`
4. Sur le frontend public : acheter en mode manual → upload reçu
5. Sur le dashboard admin : valider le paiement → vérifier que le billet est généré
6. Sur le scanner : scanner le QR → vérifier `ACCES VALIDE`

---

## 12. Sprint 6b — Dashboard admin (détail)

### Architecture auth frontend

- **AuthProvider** (`src/contexts/auth.tsx`) : stocke JWT + admin dans localStorage, expose `useAuth()` hook
- **admin-api.ts** (`src/lib/admin-api.ts`) : instance axios avec intercepteur Bearer auto + refresh 401 automatique
- **Guard** : le layout admin (`src/app/admin/layout.tsx`) redirige vers `/admin/login` si non authentifié
- **Sidebar** : navigation role-aware (les agents ne voient pas "Collaborateurs")

### Pages admin livrées

| Route | Fonctionnalités |
|---|---|
| `/admin/login` | Email + password, support 2FA (HTTP 202 → affiche champ OTP), toast bienvenue |
| `/admin` | Dashboard : compteurs (events, paiements pending), raccourcis cliquables, 5 derniers paiements en attente |
| `/admin/events` | Liste avec search, badges status/mode/template, liens edit + preview public + soft delete |
| `/admin/events/new` | Formulaire création avec auto-slug depuis le nom (normalisation accents) |
| `/admin/events/[id]` | 4 onglets : Details, Formules, CMS, Paiement |
| `/admin/events/[id]` — Details | Edit champs + transitions de statut (draft→open→live→closed) |
| `/admin/events/[id]` — Formules | CRUD inline (ajout + désactivation), affiche stock/vendus |
| `/admin/events/[id]` — CMS | Editeur key/value, ajout/suppression/modification, sauvegarde bulk |
| `/admin/events/[id]` — Paiement | Config bénéficiaire, montants FCFA/EUR/USD, toggle digital/manual |
| `/admin/manual-payments` | Liste filtrable par status (pending/validated/rejected/tous), preview image reçu, boutons valider (→ génère tickets) / rejeter (avec motif obligatoire) |
| `/admin/admins` | CRUD collaborateurs (super_admin only) : création avec rôle, désactivation, badges rôle + 2FA |
| `/admin/audit-logs` | Journal d'audit (super_admin) : filtres action_prefix + resource_type, pagination, table avec IP + payload JSON |
| `/admin/2fa` | Setup TOTP : génère secret, affiche QR (via qrserver.com), vérifie code → active ; si déjà actif : disable avec mot de passe + code |
| `/admin/events/[id]` — Groupes WA | CRUD groupes WhatsApp (invite_link, capacité 900, basculement auto quand plein) |
| `/admin/events/[id]` — FAQ | CRUD FAQ chatbot (question/réponse/ordre), consommées par le widget public |

### Décisions de design frontend admin

- **Pas de state management global** (Redux etc) — `useAuth()` context + TanStack Query suffisent
- **Pas de routing imbriqué complexe** — les onglets event detail sont des composants internes, pas des routes
- **JWT dans localStorage** (pas httpOnly cookie) — simplifie l'intercepteur axios, acceptable car pas d'accès SSR aux tokens
- **Refresh auto** — l'intercepteur 401 tente un refresh silencieux avant de rediriger vers login

---

## 13. Sprint 6c — Scanner QR (détail)

### Fonctionnalités

- **Scan caméra** : html5-qrcode avec `facingMode: 'environment'` (caméra arrière sur mobile)
- **Saisie manuelle** : champ texte pour coller le contenu du QR (fallback si caméra indisponible)
- **Feedback visuel** : carte verte (ACCES VALIDE) ou rouge (ACCES REFUSE) avec icône emoji
- **Feedback sonore** : beep différent valid/invalid (Audio API, base64 inline)
- **Infos affichées** :
  - Valide : nom participant, nom event, formule
  - Invalide : message d'erreur contextualisé (7 raisons possibles)
  - Duplicate : nom participant + date/heure premier scan + email du premier scanner
- **UX mobile-first** : layout centré max-w-md, boutons larges, pas de sidebar pendant le scan

### Endpoint consommé

`POST /api/v1/tickets/scan` avec `{ qr_token: string }` → `ScanResponse`

Le backend utilise `SELECT FOR UPDATE` pour empêcher les scans concurrents du même billet.

---

## 14. Documents de reference

- `Plan_Developpement_Billetterie.docx` — Plan de développement avec phases et sprints
- `Cahier_des_charges_Billetterie_Hybride_v2.docx` — Cahier des charges détaillé v2.0
- `farahevent-backend/RAPPORT_DEV.md` — Rapport de développement initial (pré-refonte)

---

## 15. API endpoints résumé

### Public (anonyme)

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/v1/events/` | Liste events ouverts/live/closed |
| GET | `/api/v1/events/{slug}` | Détail event + formules + payment_config |
| POST | `/api/v1/orders/` | Créer commande (upsert participant) |
| GET | `/api/v1/orders/{id}` | Status polling |
| POST | `/api/v1/orders/{id}/manual-payment` | Upload preuve paiement (multipart) |
| POST | `/api/v1/tickets/resend` | Re-livraison billet (stub Sprint 6) |
| POST | `/api/v1/webhooks/paydunya` | Webhook PayDunya (stub Sprint 5) |
| GET | `/api/v1/events/{slug}/faqs` | FAQ publiques d'un event (widget chatbot) |

### Admin (JWT requis)

| Méthode | Route | Rôle | Rôles autorisés |
|---|---|---|---|
| POST | `/admin/auth/login` | Login + OTP optionnel | — |
| POST | `/admin/auth/refresh` | Refresh token | — |
| POST | `/admin/auth/2fa/setup` | Générer secret TOTP | tous |
| POST | `/admin/auth/2fa/verify` | Vérifier code TOTP | tous |
| DELETE | `/admin/auth/2fa` | Désactiver 2FA | tous |
| GET/POST | `/admin/admins/` | CRUD collaborateurs | super_admin |
| GET/POST/PUT/DELETE | `/admin/events/` | CRUD events + transitions statut | super_admin, manager |
| PATCH | `/admin/events/{id}/status` | Transition de statut | super_admin, manager |
| DELETE | `/admin/events/{id}` | Soft delete | super_admin |
| GET/POST/PUT/DELETE | `/admin/events/{eid}/formulas/` | CRUD formules | super_admin, manager |
| PUT | `/admin/events/{eid}/cms/` | Bulk upsert CMS | super_admin, manager |
| PUT | `/admin/events/{eid}/payment-config/` | Upsert config paiement | super_admin, manager |
| GET/POST/PUT/DELETE | `/admin/events/{eid}/whatsapp-groups/` | CRUD groupes WA | super_admin, manager |
| GET/POST/PUT/DELETE | `/admin/events/{eid}/faqs/` | CRUD FAQ chatbot | super_admin, manager |
| GET/POST/PUT/DELETE | `/admin/events/{eid}/email-automations/` | CRUD automations | super_admin, manager |
| GET | `/admin/manual-payments/` | Liste paiements manuels (filtres) | super_admin, manager, comptable |
| POST | `/admin/manual-payments/{id}/validate` | Valider → génère tickets | super_admin, manager, comptable |
| POST | `/admin/manual-payments/{id}/reject` | Rejeter avec raison | super_admin, manager, comptable |
| POST | `/api/v1/tickets/scan` | Scanner QR (FOR UPDATE) | super_admin, manager, agent |
| GET | `/api/v1/tickets/{id}/qr` | Télécharger QR image | super_admin, manager, agent |
| GET | `/admin/audit-logs/` | Journal d'audit (filtres action_prefix, resource_type, admin_id, limit/offset) | super_admin |
