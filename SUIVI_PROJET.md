# Suivi de projet — FarahEvent

> **Document vivant.** Mis à jour à chaque avancée. Dernière MAJ : **2026-07-13**.
> Objectif : garder en un seul endroit le contexte, ce qui est fait, ce qui reste, comment
> faire tourner le projet, et la dette connue.

---

## 1. Contexte & vision

**FarahEvent** = plateforme de billetterie hybride (présentiel + streaming en ligne) pour
événements en Côte d'Ivoire. Réutilisable pour plusieurs événements, opérée par le client
sans compétence technique. Premier événement cible : ≥ 1 500 présentiel + 3 000 en ligne.

Le projet est un **monorepo** :
- `farahevent-backend/` — API **FastAPI** (Python 3.11, SQLAlchemy async, PostgreSQL, Alembic).
- `farahevent-frontend/` — **Next.js 14** (App Router, Tailwind, shadcn/ui, TanStack Query),
  4 templates publics commutables (A KEYNOTE / B SPOTLIGHT / C DIRECTOR'S CUT / D PULSE) +
  dashboard admin (BFF cookie httpOnly).

### Décisions actées (périmètre du 1er lancement)
- **Pas de date de lancement fixe** → on séquence par **valeur/risque**, qualité prioritaire
  (tests en parallèle de chaque chantier).
- **Streaming live différé en v2** — hors chemin critique du 1er événement (présentiel + online
  sans live). Chantier lourd (VPS 2, Ant Media pass-through, BunnyCDN, session Redis, test de charge).
- **Stack confirmée = le code réel**, PAS les CDC de juin :
  - Paiement : **PayDunya** (pas CinetPay).
  - WhatsApp : **OpenWA** (pas Evolution API).
  - **4 templates** A/B/C/D (pas 2).
  - ⚠ Les CDC v2 (juin) sont **périmés** sur ces points → à annoter si on les rouvre.

### Documents de référence
- `Cahier_des_charges_Billetterie_Hybride_v2.docx` (CDC v2, juin — partiellement périmé).
- `Plan_Developpement_Billetterie.docx` (plan en 10 phases).
- `CDC_Frontend_Billetterie.md` (wireframes + 4 templates — fait foi côté front).
- `farahevent-backend/RAPPORT_DEV.md` (journal sprints backend).

---

## 2. État général & maturité

Point de départ (audit due-diligence, juillet) : bonne **architecture** (BFF, provider abstrait,
RBAC, QR-JWT, audit trail) mais **système incomplet** — paiement digital stub, livraison billets
stub, frontend en **mode mock** (non intégré), **zéro test**, pas de CI, défauts de config non sûrs.

Depuis, on a durci le socle, complété des morceaux critiques du paiement, et **intégré le
frontend au vrai backend** (l'admin pilote un événement, le client le voit et peut acheter, avec
de vraies données de bout en bout).

**Reste bloquant avant prod** : tests automatisés, PayDunya (paiement digital), CI, et le
durcissement DevOps (voir §6 et §7).

---

## 3. Environnement de dev (comment faire tourner)

### Backend + Postgres + Redis (Docker)
```bash
cd farahevent-main            # racine du repo (contient docker-compose.dev.yml)
docker compose -f docker-compose.dev.yml up --build -d
# API : http://localhost:8000/health  et  http://localhost:8000/docs
# Migration Alembic appliquée automatiquement au boot, puis uvicorn --reload.
```
Créer un super admin :
```bash
docker compose -f docker-compose.dev.yml exec backend \
  python -m scripts.create_super_admin admin@farahevent.tech "Str0ngP@ss!" William Mickey
```
Arrêter : `docker compose -f docker-compose.dev.yml down` (ajouter `-v` pour purger la BDD).

### Frontend (Next dev, câblé sur le vrai backend)
- Bascule mock → réel via `farahevent-frontend/.env.development.local` (non versionné) :
  `NEXT_PUBLIC_USE_MOCK=0`, `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`,
  `ADMIN_API_URL=http://localhost:8000/api/v1`, `REVALIDATE_SECRET=dev-revalidate-secret`.
- Lancé via le harness (`.claude/launch.json` → service `frontend`, `npm --prefix … run dev`, :3000).
- Sur `NEXT_PUBLIC_USE_MOCK=1` (`.env.local`) le front tourne sur fixtures, sans backend.

### Comptes de test
- **Admin pilote (sans 2FA)** : `pilot@farahevent.tech` / `Pilot@Pass1` (super_admin).
- `admin@farahevent.tech` a le **2FA activé** (créé pendant les tests).

### Données de test
La BDD dev contient des événements/commandes de test (`Recon`, `OverTest`, slug `recon-81fefe8e`).
`down -v` les efface.

### Tests backend
```bash
bash run_tests.sh                    # toute la suite (crée farahevent_test, installe pytest, run)
bash run_tests.sh -k oversell -v     # un sous-ensemble
```
Base de test dédiée `farahevent_test` (jetable) + NullPool (isolation event loop async).

---

## 4. Plan par chantiers (séquence valeur/risque)

| # | Chantier | État |
|---|---|---|
| 1 | Sécurité socle | ✅ **Terminé & validé end-to-end** |
| 2 | Paiement complet | 🟡 **Partiel** (oversell + réconciliation faits ; PayDunya reporté) |
| 3 | Intégration front↔back | 🟡 **Quasi terminé** (admin + public faits ; comms/WS restants) |
| 4 | Livraison billets & comms | 🔴 À faire (Brevo + file OpenWA + n8n) |
| 5 | DevOps / prod | 🔴 À faire (compose prod, nginx/SSL, CI, backups) |
| 6 | Tests & QA | 🟡 **En cours** — pytest backend (25 tests verts) + CI ; Playwright + charge à faire |
| 7 | Déploiement + docs + formation | 🔴 À faire |
| v2 | Streaming live | 🔴 Différé après le 1er event |

---

## 5. Ce qui a été fait (détaillé)

### Chantier 1 — Sécurité socle ✅ (validé sur stack Docker live)
**Quick wins :**
- **Boot-guard prod** — `config.py` refuse de démarrer si `APP_ENV=production` avec `SECRET_KEY`
  par défaut / `DEBUG=True` / mdp DB par défaut / `TICKET_SIGNING_KEY` manquante ou = SECRET_KEY.
- **2FA anti-verrouillage** — colonne `admins.two_factor_secret_temp` ; le secret n'est activé
  (donc exigé au login) qu'après un premier OTP validé via `/verify` (avant : un setup abandonné
  bloquait le compte).
- **N+1 supprimé** — `admin/manual_payments.py` : `selectinload` au lieu de 4 requêtes/ligne.
- **Bug stock formule `both`** — `ticket_service` : `+= 1` (avant : `+= len(tickets)` = double
  décompte du stock pour une formule mixte).
- **2 index** — `ix_tickets_order_id`, `ix_formulas_event_id` (migration `0002_quickwins`).
- **httpx partagé + logging** — `whatsapp_service` réutilise un `AsyncClient`, `logger.exception`
  au lieu de `print`.

**Trio sécurité :**
- **Rate-limiting** (`slowapi`, `app/core/rate_limit.py`) : `/admin/auth/login` 5/15 min,
  `/orders/` 5/min, `/tickets/resend` 3/h. Handler 429 dans `main.py`.
- **Turnstile côté serveur** (`app/services/turnstile_service.py`, champ `turnstile_token` dans
  `OrderCreateRequest`) — vérifie le jeton Cloudflare ; **no-op si `TURNSTILE_SECRET_KEY` vide** (dev).
- **Reçus non publics** — `upload_service` retourne une clé de stockage ; mount statique `/uploads`
  **retiré** ; route admin authentifiée `GET /admin/manual-payments/{id}/receipt` (garde anti-traversée).

**Séparation des clés :** `TICKET_SIGNING_KEY` dédiée aux billets QR/live (`qr_service`), distincte
de `SECRET_KEY` (une rotation/fuite de l'un ne casse pas l'autre). Fallback `SECRET_KEY` en dev.

**DevOps dev :** `docker-compose.dev.yml` (postgres 16 + redis 7 + backend, migration auto + reload)
+ `.dockerignore`.

*Validé live :* migration OK, /health+/docs 200, rate-limit 429 au 6e login, Turnstile no-op,
billet non décodable avec SECRET_KEY (clés séparées), /uploads 404 + route reçu 403, cycle 2FA complet.

### Chantier 2 — Paiement 🟡
- **Point 4 — Oversell éliminé** ✅ : `ticket_service.generate_for_order` verrouille la formule
  (`SELECT … FOR UPDATE`), idempotence sous verrou, garde de stock → `StockExceededError` →
  `manual_payments.validate` renvoie 409 (rollback, l'order reste `MANUAL_PENDING`).
  *Validé par un test de concurrence (2 sessions, stock=1 → 1 émis / 1 refusé).*
- **Point 3 — Réconciliation** ✅ : `app/services/reconciliation_service.py` interroge le provider
  pour les commandes `PENDING` orphelines (webhook manqué) → `paid`→billets, `failed`→FAILED,
  trop vieux (>24 h)→FAILED. Provider-agnostique. Boucle 5 min dans le lifespan de `main.py`.
  *Validé sur 6 cas limites.*
- **Points 1-2 — PayDunya** ⏳ **reportés** : `PayDunyaProvider` (create_checkout/get_status) +
  `POST /webhooks/paydunya` signé (hash SHA-512 master key) + idempotence. Attend les **creds
  sandbox PayDunya**. Le webhook/provider sont validables avec un IPN simulé signé même sans creds.

### Chantier 3 — Intégration front↔back 🟡
**Constat clé :** « sortir du mock » n'était PAS un flag — le front a été construit UI-first contre
des contrats que le backend n'implémentait qu'en partie. Il a fallu **construire les endpoints manquants**.

**Chaîne d'auth** ✅ : login → BFF (`/api/admin-session/login`) → cookie httpOnly → proxy
(`/api/proxy/*`) → backend réel → refresh silencieux.
- 🐞 **Bug de session corrigé** : à 30 min le cookie d'access expire, le proxy ne transmettait plus
  de Bearer → backend 403 → le proxy ne rafraîchissait que sur **401** → session cassée. Fix des
  deux côtés : `auth.py` refresh caste `sub` en UUID ; `proxy/route.ts` rafraîchit sur
  `401 || (403 && !access)`.

**Endpoints backend construits :**
- `admin/dashboard.py` → `GET /admin/stats` (KPIs + ventes/formule + ventes/pays + série revenus +
  activité) et `GET /admin/notifications` (paiements manuels en attente).
- `admin/participants.py` → `GET /admin/participants` (paginé/filtré/trié + facettes ; `scanned`
  en colonne corrélée, pas de N+1).
- `admin/finance.py` → `GET /admin/finance` (bilan gross/refunded/net/pending + transactions) et
  `POST /admin/transactions/{id}/refund` (→ REFUNDED + libère une place sous verrou).
- `admin/event_draft.py` → `GET /admin/events/{id}/draft` (EventDraft 8 sections) et
  `PATCH /admin/events/{id}/{section}` (blob JSON dans `event_content["draft:{section}"]`, `general`
  miroité vers la table `events`). Enregistré **après** admin_events pour ne pas court-circuiter `/status`.
- `events.py` (public) → `GET /events/{slug}/config` : **agrégateur EventConfig** (14 clés) = infos
  event + blobs CMS + formules réelles (mapping single→bilingue, `remaining`) + payment_config + FAQ.

**Validé en live (navigateur, mock OFF) :**
- Dashboard rendu (Billets 3, Revenus, ventes/pays, activité réelle).
- Participants (8 inscrits, filtres/facettes/pagination).
- Finances (bilan + remboursement reflété en direct).
- CMS événement (12 onglets, Général peuplé, round-trip PATCH content/general).
- **Landing publique Template A** (hero, à-propos édité en CMS, formule « 100 places restantes »,
  CTA → page d'achat avec le vrai formula UUID) + **page d'achat** (radio formule + formulaire).
- Onglets CMS legacy (Formules/FAQ/WhatsApp/Paiement) : **déjà** câblés sur les endpoints existants.
- **Revalidation ISR** ✅ — `app/services/revalidate_service.py` : le PATCH CMS (`event_draft`)
  appelle `POST {FRONTEND_INTERNAL_URL}/api/revalidate {tag:"event:<slug>"}` (secret partagé) →
  la landing se met à jour **instantanément**. Dev : `FRONTEND_INTERNAL_URL=http://host.docker.internal:3000`
  (backend en conteneur, front sur l'hôte). *Validé : édition CMS → landing màj sans revalidation manuelle.*
- **Les 4 templates A/B/C/D validés** en live — même config, couleurs pilotées depuis le CMS
  (`--color-primary/--color-bg` injectées), landing + formule + lien d'achat OK sur chacun.

### Chantier 6 — Tests 🟡 (démarré)
Suite `pytest` backend contre une **base de test Postgres dédiée** (`farahevent_test`), NullPool +
event loop de session pour l'isolation async, override d'auth pour le RBAC. **25 tests verts** :
- `test_ticket_service.py` — idempotence + garde de stock (anti-oversell) + formule `both` (1 place).
- `test_reconciliation.py` — paid→billets / failed / stale→FAILED / trop-récent ignoré.
- `test_manual_payments_http.py` — validation manuelle → billets, puis 409 si stock épuisé (HTTP).
- `test_rbac.py` — agent interdit, manager autorisé, manager interdit sur finances.
- `test_scan.py` — QR single-use (2e scan rejeté) + jeton forgé rejeté.
- `test_orders_public.py` — création commande manuel/digital, mode désactivé (400), épuisé (409), upload non-image (415).
- `test_finance.py` — bilan gross/refunded/net/pending + remboursement (et 409 si non payé).
- `test_dashboard.py` — KPIs (tickets/revenus) + ventes par formule + notifications (manuel en attente).
- `test_event_status.py` — transitions draft→open (ok) / draft→closed (409).
- `test_2fa_login.py` — login sans 2FA / secret temp ne verrouille pas (200) / 2FA actif exige OTP (202) / mdp faux (401).
- `test_participants.py` — total + facettes + filtre par statut.

Lancement : `bash run_tests.sh`. Deps dans `requirements-dev.txt`.

**CI** : `.github/workflows/ci.yml` — job **backend** (Postgres service + `pytest`) + job **frontend**
(`npm ci` → `lint` → `typecheck`). YAML validé, frontend lint/typecheck **verts en local**, backend
pytest prouvé via Docker. ⚠ Pas encore de **remote GitHub** → le workflow tournera dès un `git push`.

---

## 6. Ce qui reste à faire

### Chantier 3 (finir)
- **Communications** — `GET /admin/communications/recipients` + `POST /admin/communications/send`
  (dépend de Brevo + OpenWA — externe).
- **WS notifications temps réel** — `/ws/admin/notifications` (aujourd'hui 403 ; le front dégrade
  via backoff). À construire **avec auth** (ticket WS via BFF, car le JWT est en cookie httpOnly).
- **Suivi #2** : `next/image` rejette un `hero_image_url` d'un hôte hors `next.config` remotePatterns
  → prévoir loader/allowlist pour les images uploadées par l'admin.
- Étendre la **revalidation ISR** aux autres endpoints qui modifient la landing (formulas, cms
  content, payment_config, faqs) — aujourd'hui branchée sur `event_draft` uniquement.

### Chantier 2 (finir)
- `PayDunyaProvider` + webhook signé HMAC + idempotence (quand creds sandbox dispo).

### Chantiers 4–7
- **Livraison** : service Brevo (email), file Redis OpenWA (retry/DLQ), routage groupes WhatsApp
  (`pick_next_group` existe), n8n (rappels J-7…J+7).
- **DevOps prod** : `docker-compose.prod.yml` (nginx/SSL, uptime-kuma), Dockerfile durci (non-root,
  healthcheck, gunicorn workers), CI (lint ruff/black/mypy + eslint + typecheck + tests + build),
  backups PostgreSQL.
- **Tests** : pytest (paiement→billet, double-scan, RBAC), Playwright (tunnel d'achat), charge
  (100 achats, réconciliation), Lighthouse mobile > 80 × 4 templates.
- **Déploiement** : mise en prod 2 VPS, docs (technique, guide admin, jour J), formation client.

### v2
- **Streaming** : Ant Media + tokens live + session Redis + player + test de charge 3 000 viewers.

---

## 7. Dette technique & risques connus (issus de l'audit)

| Sujet | État |
|---|---|
| Tests automatisés | 🟡 **pytest backend démarré** (9 tests : billets/oversell/réconciliation/RBAC/scan) ; **Playwright (front) + charge** restent |
| CI/CD | 🟡 workflow **GitHub Actions écrit** (backend pytest + front lint/typecheck) ; **remote GitHub + Dockerfile frontend + compose prod** restent |
| **Logging structuré global** (seul `whatsapp_service` fait) | 🟡 §E.1 audit |
| Écriture fichier synchrone dans `upload_service` (bloque l'event loop) | 🟡 §D.2, différé |
| **Pas de révocation** des refresh tokens (logout = cookies seulement) | 🟡 |
| `x-forwarded-for` pris brut dans l'audit (IP falsifiable) | 🟡 |
| XSS stocké latent : CMS stocke le HTML brut (sanitisé au rendu front seulement) | 🟡 |
| Redis désormais utilisable ; encore peu exploité (cache lecture publique = TODO) | 🟡 §D.4 |
| Middleware : build accidentel `USE_MOCK=1` désactive la garde admin | 🟡 hygiène deploy |

---

## 8. Carte des fichiers clés

**Backend** (`farahevent-backend/app/`)
- `core/config.py` — settings + boot-guard prod + `ticket_signing_key`.
- `core/security.py` — JWT session, `get_current_admin`, `require_roles`.
- `core/rate_limit.py` — limiter slowapi partagé.
- `main.py` — app, CORS, limiter, boucle de réconciliation (lifespan).
- `services/` — `ticket_service` (émission + anti-oversell), `qr_service` (QR-JWT), `payment_provider`
  (interface + stub), `reconciliation_service`, `turnstile_service`, `whatsapp_service`,
  `upload_service`, `two_factor_service`, `audit_service`.
- `api/v1/endpoints/` — public : `events` (+ `/config`), `orders`, `tickets`, `payments`(stub),
  `webhooks`(stub) ; admin : `auth`, `dashboard`, `participants`, `finance`, `event_draft`,
  `manual_payments`, `events`, `formulas`, `cms`, `two_factor`, `admins`, `audit_logs`, …
- `api/v1/router.py` — montage des routes (⚠ `event_draft` monté **après** `admin_events`).
- `alembic/versions/` — `0001_initial_schema`, `0002_quickwins`.

**Frontend** (`farahevent-frontend/src/`)
- `lib/security/session.ts`, `app/api/admin-session/*`, `app/api/proxy/[...path]/route.ts` — BFF.
- `lib/api/` + `lib/api/admin/` — modules d'appel (chacun `if USE_MOCK … else vrai fetch`).
- `types/` — contrats (`event-config`, `event-draft`, `admin-stats`, `participant`, `finance`…).
- `components/templates/{keynote,spotlight,directors-cut,pulse}/` — les 4 templates.
- `components/admin/` — shell, dashboard, event-config (CMS), table, participants.
- `middleware.ts` — i18n + garde `/admin`.

---

## 9. Changelog

### 2026-07-13 (suite)
- **Couverture backend étoffée** : 9 → **25 tests** (commande publique, finances, dashboard,
  transitions de statut, 2FA login anti-lockout, participants). Repo GitHub fourni par le client :
  https://github.com/william1mufassa/farahevent (à connecter + push pour déclencher la CI).
- **CI écrite** : `.github/workflows/ci.yml` (backend pytest + Postgres, frontend lint/typecheck).
  YAML validé, front lint/typecheck verts en local. Tournera dès qu'un remote GitHub sera ajouté.
- **Chantier 6 démarré** : suite `pytest` backend (9 tests verts) sur base de test dédiée —
  billets/anti-oversell, réconciliation, paiement manuel HTTP, RBAC, scan QR single-use.
  Runner `run_tests.sh`, `requirements-dev.txt`, `pytest.ini`, NullPool en test (`DB_NULLPOOL=1`).
- Suivi #1 **fermé** : hook de revalidation ISR (`revalidate_service`) branché sur le PATCH CMS —
  édition CMS → landing mise à jour instantanément (validé). Ajout `FRONTEND_INTERNAL_URL` +
  `REVALIDATE_SECRET` (config + compose dev via `host.docker.internal`).
- **Templates A/B/C/D tous validés** en live (bascule via CMS section design, couleurs injectées).
- Création de `SUIVI_PROJET.md` (ce document vivant).

### 2026-07-13
- Chantier 3 : agrégateur public `GET /events/{slug}/config` construit + validé (landing Template A
  + page d'achat en live). Bug de session admin 30 min corrigé. CMS édition (draft/section) construit.
  Dashboard, Participants, Finances construits + validés. Découverte des 2 suivis (revalidate ISR,
  next/image allowlist).
- Chantier 2 : oversell (FOR UPDATE) + réconciliation construits + validés. PayDunya reporté.
- Chantier 1 : sécurité socle (6 quick wins + trio sécurité + séparation clés + compose dev) terminé
  et validé end-to-end sur stack Docker.
- Audit de due-diligence initial réalisé ; plan d'action par chantiers établi.

<!-- Ajouter les prochaines entrées au-dessus de cette ligne, date décroissante. -->
