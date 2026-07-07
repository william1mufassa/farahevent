# FarahEvent Backend — Rapport de développement

## Sprint 1 — Refonte du schéma BDD + Alembic (terminé)

Le squelette existant a été refait de zéro pour être conforme au cahier des charges v2.0.
Décisions actées avec le client :

- **Paiement** : PayDunya (en attente d'activation du compte marchand). Le modèle `Order` est désormais provider-agnostique (`payment_provider`, `payment_provider_ref`, `payment_provider_checkout_id`).
- **WhatsApp** : OpenWA uniquement.
- **Achat** : anonyme — l'acheteur n'a pas de compte, il remplit un formulaire.
- **Streaming** : reporté (phase 5). Les colonnes `stream_key`/`stream_hls_url` sur `events` restent nullable pour ne pas casser la migration future.

### Ce qui a changé

| Avant | Après |
|---|---|
| Table `users` (attendee/organizer/admin) | Deux tables : `participants` (acheteurs) + `admins` (super_admin/manager/agent/comptable) |
| `POST /auth/register` public | Supprimé. Le premier super_admin se crée en CLI (`scripts/create_super_admin.py`). |
| Colonnes `wave_*` sur `orders` | Colonnes agnostiques `payment_provider_*` |
| Statuts commande (`pending/completed/failed/refunded`) | 7 statuts conformes cahier : `PENDING/PAID/FAILED/MANUAL_PENDING/MANUAL_VALIDATED/REJECTED/REFUNDED` |
| Table `ticket_categories` | Renommée `formulas`, ajoute `channel` (presentiel/online/both), `advantages`, `sort_order` |
| `Base.metadata.create_all` au startup | Retiré. Le schéma est géré par Alembic. |
| `wave_service.py` | Supprimé. Sera remplacé par le service PayDunya au Sprint 5 (par le collabo). |

### Tables (14) — toutes créées par la migration `0001_initial_schema`

`admins`, `participants`, `events`, `formulas`, `payment_config`, `event_content`, `whatsapp_groups`, `chatbot_faqs`, `email_automations`, `orders`, `tickets`, `manual_payments`, `scan_logs`, `audit_logs`.

### Fichiers créés/modifiés

```
app/models/           14 nouveaux modèles + enums.py (13 enums métier)
app/core/config.py    settings PayDunya + Brevo + Upload + DATABASE_URL_SYNC
app/core/security.py  get_current_admin (renvoie l'Admin complet) + require_roles(...)
app/api/v1/router.py  prefix /admin/auth ; stubs 501 sur les autres endpoints (rewrite S2-S5)
app/api/v1/endpoints/auth.py   POST /admin/auth/login + POST /admin/auth/refresh
alembic/env.py                  bootstrap Alembic avec engine sync (psycopg2)
alembic/versions/0001_initial_schema.py   Migration initiale complète (14 tables)
scripts/create_super_admin.py   CLI de création du premier super_admin
```

## 🚀 Commandes pour appliquer le Sprint 1

Prérequis : PostgreSQL 16 démarré localement, base `farahevent` créée, user `farahevent_user` avec le mot de passe du `.env`.

```bash
# 1. Créer un venv Python 3.11 (recommandé — matche le Dockerfile)
python -m venv .venv
source .venv/Scripts/activate     # bash / git-bash
# ou   .venv\Scripts\Activate.ps1  (PowerShell)

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Créer la BDD (une fois — si pas déjà fait)
createdb -h localhost -U farahevent_user farahevent

# 4. Appliquer la migration initiale
alembic upgrade head

# 5. Créer le premier super_admin
python -m scripts.create_super_admin admin@farahevent.tech "Str0ngP@ss!" William Mickey

# 6. Lancer le serveur
uvicorn app.main:app --reload --port 8000

# 7. Tester le login admin
curl -X POST http://localhost:8000/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@farahevent.tech","password":"Str0ngP@ss!"}'
```

Rollback possible :

```bash
alembic downgrade base   # supprime toutes les tables
```

## Endpoints Sprint 1 fonctionnels

| Route | Statut |
|---|---|
| `GET /health` | ✓ |
| `POST /api/v1/admin/auth/login` | ✓ |
| `POST /api/v1/admin/auth/refresh` | ✓ |

## Sprint 2 — Endpoints publics anonymes (terminé)

### Endpoints livrés

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/v1/events/` | Liste des événements publics (open/live/closed) |
| GET | `/api/v1/events/{slug}` | Détail : infos + formules actives + config paiement |
| GET | `/api/v1/events/{slug}/payment-config` | Instructions paiement manuel |
| POST | `/api/v1/orders/` | Création anonyme (upsert participant + init paiement) |
| POST | `/api/v1/orders/{id}/manual-payment` | Upload preuve (multipart) |
| GET | `/api/v1/orders/{id}` | Statut public (polling frontend) |
| POST | `/api/v1/tickets/resend` | Re-livraison billet (email + order_id) |

### Décisions et détails

- **Anonymat** : `POST /orders/` reçoit `event_id`, `formula_id`, un objet `participant` (nom, email, WhatsApp au format international `+225…`, pays), et `payment_mode` (`digital`/`manual`). L'API upsert le participant (même email + même événement = même participant), crée l'order en `PENDING`, puis délègue au provider.
- **Interface `PaymentProvider`** ([services/payment_provider.py](farahevent-backend/app/services/payment_provider.py)) — le collabo n'a qu'à écrire `PayDunyaProvider(PaymentProvider)` et l'assigner à `payment_provider` en variable module. Zéro modification côté endpoints. Contrat : `create_checkout(order_id, amount, currency, ...)` → `CheckoutSession(checkout_id, checkout_url, provider)`.
- **Stub actuel** (`StubPaymentProvider`) : renvoie une URL frontend `paiement/attente?order_id=…` pour que l'UX ne casse pas tant que PayDunya n'est pas branché.
- **Paiement manuel** : multipart form (`operator`, `sender_name`, `sender_country`, `receipt`). L'upload est validé sur MIME (`image/jpeg` ou `image/png`), sur magic bytes, sur taille (≤ `MAX_UPLOAD_SIZE_MB`). Stockage dans `uploads/receipts/<year>/<month>/<uuid>.<ext>`. En dev, FastAPI sert `/uploads/*` via `StaticFiles` ; en prod c'est Nginx.
- **Re-soumission de preuve** autorisée uniquement tant que le manual_payment est `pending` (pas après validation/rejet admin).
- **Cohérence mode/canal** : une formule `online` ne peut pas être achetée sur un événement `presentiel` (et inversement). `hybrid` accepte tout.
- **`GET /orders/{id}`** : conçu pour le polling frontend (`payment/attente`). Retourne le statut de l'order + celui du manual_payment si présent.
- **`POST /tickets/resend`** : valide l'existence de la paire (email, order_id) et l'état payé, mais l'envoi réel via Brevo/OpenWA est branché au Sprint 6.

### Fichiers créés/modifiés

```
app/schemas/                     participant.py + event.py + order.py
app/services/upload_service.py   validation MIME/magic bytes/taille + stockage hashé
app/services/payment_provider.py interface + stub (le collabo étend en S5)
app/api/v1/endpoints/events.py   list, get_by_slug, get_payment_config
app/api/v1/endpoints/orders.py   create anonymous, submit manual proof, get status
app/api/v1/endpoints/tickets.py  resend (stub d'envoi)
app/main.py                      mount StaticFiles /uploads en dev
```

### Ce qui reste explicitement hors Sprint 2 (repoussé)

- **Rate limiting** sur `POST /orders/` — Sprint 5.
- **CAPTCHA** (Turnstile) — Sprint 5.
- **Envoi effectif email/WhatsApp** — Sprint 6.
- **Génération de ticket** après paiement → attendra que le webhook du provider ou la validation admin déclenche le service (Sprints 3, 4, 5 en concertation).

## Sprint 3 — QR JWT signé + contrôle d'accès (terminé)

### Endpoints livrés

| Méthode | Route | Auth | Rôle |
|---|---|---|---|
| POST | `/api/v1/tickets/scan` | Bearer admin | `agent` / `super_admin` |
| GET | `/api/v1/tickets/{id}/qr` | Bearer admin | `agent` / `manager` / `super_admin` |

### Détails techniques

- **QR = JWT HS256 signé** ([qr_service.py](farahevent-backend/app/services/qr_service.py)) — claims : `sub` (ticket_id), `evt`, `frm`, `pn` (participant_name), `iat`, `type="qr_ticket"`. Signature avec `SECRET_KEY` : infalsifiable sans lookup BDD.
- **`ticket_service.generate_for_order(order, db)`** ([ticket_service.py](farahevent-backend/app/services/ticket_service.py)) — idempotent, appelable par (a) le webhook PayDunya (Sprint 5) et (b) la validation admin manual_payment (Sprint 4). Génère un ticket QR pour le présentiel, un ticket live_link pour l'online, les deux pour un canal `both`. Incrémente `formula.sold_quantity`.
- **`POST /scan`** — auth admin obligatoire (rôle `agent` ou `super_admin`), body `{ "qr_token": "..." }`. Vérifie signature JWT → ticket existe → événement pas en `draft` → `order` payé → `is_scanned` false. Utilise `SELECT ... FOR UPDATE` pour éviter le double-scan concurrent. Écrit systématiquement dans `scan_logs` (valid/invalid/duplicate) avec l'admin qui a scanné.
- **Format de réponse standard** ([schemas/ticket.py](farahevent-backend/app/schemas/ticket.py)) — `ScanResponse` : `{ valid, reason, ticket_id, participant_name, formula_name, event_name, scanned_at, first_scan_at, first_scan_by }`. Le champ `reason` est un code stable consommable par l'app scanner (`invalid_token`, `ticket_not_found`, `wrong_event`, `event_not_open`, `wrong_ticket_type`, `already_scanned`, `order_not_paid`).
- **`GET /tickets/{id}/qr`** — récupère `qr_token` et `qr_image_data_url` pour ré-envoi manuel depuis le dashboard admin.

### Fichiers créés/modifiés

```
app/services/qr_service.py         Refactor complet : encode/decode JWT + rendu PNG base64
app/services/ticket_service.py     Nouveau : generate_for_order(order) idempotent
app/schemas/ticket.py              Nouveau : ScanRequest / ScanResponse
app/api/v1/endpoints/tickets.py    Nouveau /scan + /{id}/qr + resend inchangé
```

### Ce qui reste hors Sprint 3 (par design)

- **Frontend scanner web** — Sprint 6 (Next.js `/admin/scan` avec `html5-qrcode`).
- **Appel de `ticket_service.generate_for_order`** — se fera en Sprint 4 (validation manuelle) et Sprint 5 (webhook PayDunya).

## Sprint 4 — CRUD admin étendu + CMS (terminé)

### Endpoints livrés

Tous sous `/api/v1/admin/*`, auth Bearer obligatoire.

| Groupe | Route | Rôle |
|---|---|---|
| **Auth 2FA** | POST `/admin/auth/2fa/setup` | any admin |
| | POST `/admin/auth/2fa/verify` | any admin |
| | POST `/admin/auth/2fa/disable` | any admin |
| | POST `/admin/auth/login` (support `otp_code`) | any |
| **Collaborateurs** | GET/POST/GET-id/PATCH/DELETE `/admin/admins` | super_admin |
| **Événements** | GET/POST/GET-id/PATCH/DELETE `/admin/events` | super_admin/manager |
| | PATCH `/admin/events/{id}/status` (transitions garanties) | super_admin/manager |
| **Formules** | GET/POST `/admin/events/{event_id}/formulas` | super_admin/manager |
| | PATCH/DELETE `/admin/formulas/{id}` | super_admin/manager |
| **CMS** | GET/PUT `/admin/events/{event_id}/content` (upsert bulk clé/valeur) | super_admin/manager |
| **Payment config** | GET/PUT `/admin/events/{event_id}/payment-config` | super_admin/manager |
| **WhatsApp groups** | CRUD + POST `/admin/events/{event_id}/whatsapp-groups/next` (basculement auto verrouillé) | super_admin/manager |
| **Chatbot FAQ** | CRUD `/admin/events/{event_id}/faqs` + `/admin/faqs/{id}` | super_admin/manager |
| **Email automations** | CRUD `/admin/events/{event_id}/email-automations` | super_admin/manager |
| **Paiements manuels** | GET list + GET id `/admin/manual-payments` | super_admin/manager/comptable |
| | POST `/admin/manual-payments/{id}/validate` → génère les tickets | super_admin/manager/comptable |
| | POST `/admin/manual-payments/{id}/reject` (motif) | super_admin/manager/comptable |

### Points clés

- **2FA optionnel** ([auth.py:44-64](farahevent-backend/app/api/v1/endpoints/auth.py:44)) — un admin qui a activé le 2FA reçoit un `202 Accepted` avec `detail: "2fa_required"` s'il tente le login sans `otp_code`. Le frontend affiche l'input OTP et rappelle avec le code. Le setup en 2 étapes (setup → verify) évite qu'un secret non vérifié verrouille l'accès.
- **Transitions statut événement** ([admin/events.py:22-27](farahevent-backend/app/api/v1/endpoints/admin/events.py:22)) — matrice explicite : `draft → open`, `open → live/closed`, `live → closed`. Toute autre transition renvoie 409.
- **Soft delete** — `events.is_deleted` et `formulas.is_active=false` — les commandes/tickets passés restent intègres.
- **Audit logs systématique** — chaque endpoint mutant appelle `audit_service.log(admin, action, resource_type, resource_id, payload, request)`. IP client capturée depuis `x-forwarded-for`.
- **`manual_payment/validate` déclenche `ticket_service.generate_for_order`** ([admin/manual_payments.py:126-142](farahevent-backend/app/api/v1/endpoints/admin/manual_payments.py:126)) — le workflow complet paiement manuel → billets émis + QR JWT signé fonctionne bout en bout, en un seul appel admin.
- **`pick_next_group`** ([admin/whatsapp_groups.py:120-141](farahevent-backend/app/api/v1/endpoints/admin/whatsapp_groups.py:120)) — `SELECT ... FOR UPDATE` sur les groupes de la catégorie, retourne le premier non-plein et incrémente son compteur. À appeler par n8n / le service d'envoi WhatsApp à chaque nouvelle affectation. Renvoie 409 si tous pleins.

### Fichiers créés

```
app/schemas/admin.py            AdminOut/Create/Update, TwoFactor* schemas
app/schemas/event_admin.py      Event/Formula/EventContent/PaymentConfig/WhatsappGroup/ChatbotFaq/EmailAutomation
app/schemas/manual_payment.py   ManualPaymentOut + Reject/Validate

app/services/audit_service.py       helper log(admin, action, resource, payload, request)
app/services/two_factor_service.py  generate_secret / provisioning_uri / verify

app/api/v1/endpoints/admin/
├── __init__.py
├── admins.py           CRUD admins (super_admin)
├── two_factor.py       setup / verify / disable
├── events.py           CRUD + status transitions + soft delete
├── formulas.py         CRUD scoped par event
├── cms.py              GET/PUT bulk event_content
├── payment_config.py   GET/PUT upsert par event
├── whatsapp_groups.py  CRUD + pick_next_group (verrouillé)
├── chatbot_faqs.py     CRUD
├── email_automations.py CRUD (consommé par n8n)
└── manual_payments.py  list + validate (→ tickets) + reject
```

### Ce qui reste hors Sprint 4 (par design)

- **Dashboard stats temps réel** — Sprint 6 (endpoints d'agrégation viendront ensuite si besoin).
- **Export PDF / Excel du bilan** — Sprint 6 (frontend) ou Sprint 7 si backend.

## Sprint 6a — Frontend public (terminé)

Le frontend Next.js vit dans **un repo séparé** : `../farahevent-frontend/` (au même niveau que `farahevent-backend/`).

Stack : Next.js 14 App Router + Tailwind + shadcn/ui + TanStack Query + react-hook-form + zod + axios.

### Pages livrées

| Route | Rôle |
|---|---|
| `/` | Racine (redirect si un seul event, sinon liste) |
| `/e/[slug]` | Détail événement + formules (respecte template A/B via `data-template` CSS) |
| `/e/[slug]/acheter` | Formulaire d'achat + choix mode paiement |
| `/paiement/attente?order_id=…` | Polling 5s de `GET /orders/{id}` |
| `/paiement/manuel?order_id=…` | Upload preuve multipart |
| `/paiement/succes` / `/paiement/echec` | Résultat final |
| `/mon-billet` | Re-livraison billet |

### Points d'intégration backend

- **`POST /orders/`** — le `checkout_url` renvoyé par le stub PayDunya redirige vers `/paiement/attente`. Quand ton collabo branche PayDunya en Sprint 5, l'URL réelle sera renvoyée automatiquement (contrat inchangé).
- **Upload multipart** — `POST /orders/{id}/manual-payment` avec `Content-Type: multipart/form-data`, champ `receipt` = photo/scan.
- **Polling status** — TanStack Query stoppe automatiquement dès que le statut devient terminal (`PAID`, `MANUAL_VALIDATED`, `FAILED`, `REJECTED`, `REFUNDED`).
- **Templates A/B** — CSS variables sous `[data-template='B']` dans `globals.css`. Le composant `<ThemeWrapper>` applique la valeur `event.template` retournée par l'API.

Voir `../farahevent-frontend/README.md` pour les commandes de démarrage.

## Ce qui reste — Sprint 6 (b/c/d), Sprint 5, Sprint 7

- **Sprint 5** (collabo) — implémenter `PayDunyaProvider(PaymentProvider)` + webhook `POST /webhooks/paydunya` avec vérif HMAC. Sur `PAID`, appeler `ticket_service.generate_for_order(order, db)`. Ajouter rate limit (slowapi) + CAPTCHA Turnstile sur endpoints publics.
- **Sprint 6b** — Dashboard admin (login + 2FA, CRUD events, CMS, manual_payments, collaborateurs).
- **Sprint 6c** — Scanner QR mobile web (`/admin/scan` avec html5-qrcode consommant `POST /tickets/scan`).
- **Sprint 6d** — Chatbot widget (FAQ + escalade WhatsApp).
- **Sprint 7** — Tests E2E billetterie.
