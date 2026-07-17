# Suivi de projet — FarahEvent

> # ⚠️ CE DOCUMENT EST UN HISTORIQUE, PAS L'ÉTAT DU PROJET
>
> **L'état vivant est dans [`ETAT.md`](ETAT.md)** — à lire en premier, il fait autorité.
> Le plan d'action est dans [`ROADMAP_REMEDIATION.md`](ROADMAP_REMEDIATION.md).
>
> Ce fichier garde le **contexte, les décisions et leur pourquoi**. Il a servi de source
> d'état jusqu'au 2026-07-13, puis a **dérivé du code** : il décrivait PayDunya alors que
> le code contenait GeniusPay, ignorait le Live, `email_service` et `admin/database.py`,
> et annonçait « Chantier 3 terminé & validé end-to-end » pour du code non commité sur une
> application qui ne démarrait pas. Chaque affirmation était vraie à l'instant où elle a
> été écrite — c'est précisément le mode de défaillance.
>
> **Trois documents, trois rôles disjoints :**
>
> | Fichier | Rôle | Coût |
> |---|---|---|
> | [`ETAT.md`](ETAT.md) | **État vivant** — où on en est, quoi faire, pièges | ~2,6k tok |
> | [`ROADMAP_REMEDIATION.md`](ROADMAP_REMEDIATION.md) | Le plan — 5 sprints, gates, DoD | ~6k tok |
> | `SUIVI_PROJET.md` (ici) | **Historique & décisions** — pourquoi les choix ont été faits | ~7k tok |
>
> Dernière MAJ : **2026-07-17** — recalage sur le code réel après l'audit du 2026-07-16.

---

## 0. Point de reprise (pour la prochaine session)

> ⚠️ **Section périmée — voir [`ETAT.md`](ETAT.md).** Conservée pour l'historique.
> Ce qu'elle annonçait est fait : le travail décrit ci-dessous a été commité et poussé
> le 2026-07-16 (branche `chantier/live-delivery-admin`), PayDunya est abandonné au
> profit de **GeniusPay** (câblé le 2026-07-17), et la suite est passée de 33 à
> **153 tests**.

**Dernier commit poussé** : `a9f19b1` — `test(e2e): tunnel d'achat Playwright + point de reprise suivi` (branche `main`, poussé en début de session 3).

**Travail local NON commité / NON poussé** (à commiter en début de prochaine session) :
- **Chantier 3 (polish) — terminé & validé end-to-end en live** (voir §5), non versionné :
  - Backend : `services/notification_hub.py`, `api/v1/endpoints/ws.py` (nouveaux) ; `core/security.py`
    (`create_ws_ticket`/`decode_ws_ticket`), `core/config.py` (`WS_TICKET_EXPIRE_SECONDS`),
    `admin/dashboard.py` (`GET /admin/ws-ticket` + refactor seed), `endpoints/orders.py` (push sur
    paiement manuel), `api/v1/router.py` (montage `/ws`) ; `services/revalidate_service.py`
    (`revalidate_event_by_id`) + instrumentation ISR de `admin/{formulas,cms,payment_config,chatbot_faqs}.py`.
  - Frontend : `lib/api/admin/notifications.ts` (`adminSocketUrl` async + ticket), `lib/ws/useWebSocket.ts`
    (fabrique async), `components/admin/AdminShell.tsx`, `next.config.mjs` (`images.unoptimized`).
  - Tests : `tests/test_ws_notifications.py` (7 tests). **Suite backend : 32 tests verts.**
  - `SUIVI_PROJET.md` — cette mise à jour.

**Prochaines actions par priorité** :
1. **Commiter & pousser** le Chantier 3 ci-dessus.
2. **Chantier 2 (finir)** : `PayDunyaProvider` + webhook signé HMAC — dès que les **creds sandbox PayDunya** sont disponibles. Validable avec IPN simulé signé même sans creds réelles.
3. **Chantier 4** : Livraison billets — service Brevo (email), file Redis OpenWA (retry/DLQ), workflows n8n (rappels J-7…J+7).
4. **Chantier 5** : DevOps prod — `docker-compose.prod.yml`, Dockerfile frontend, nginx/SSL, backups, Uptime Kuma.
5. **Chantier 3 (reste)** : endpoint Communications (dépend Brevo/OpenWA — externe) ; **WS multi-worker** (backplane Redis pub/sub avant gunicorn multi-workers, cf. §7) ; robustesse `hero_image_url` vide dans les templates (cf. §7).
6. **Tests** : ajouter e2e en CI (stack complète), tests de charge (100 achats), Lighthouse mobile > 80 × 4 templates.
7. **v2** : Streaming live (Ant Media + tokens + player + session Redis + test de charge 3000 viewers).

**Comptes de test** : `pilot@farahevent.tech` / `Pilot@Pass1` (super_admin, sans 2FA).
**Repo GitHub** : https://github.com/william1mufassa/farahevent

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
  - Paiement : ~~**PayDunya** (pas CinetPay)~~ → **GeniusPay** depuis le 2026-07-16.
  - WhatsApp : **OpenWA** (pas Evolution API).
  - **4 templates** A/B/C/D (pas 2).
  - ⚠ Les CDC v2 (juin) sont **périmés** sur ces points → à annoter si on les rouvre.

> 🔁 **Décision D1 — 2026-07-16 : GeniusPay remplace PayDunya.**
> `https://geniuspay.ci/api/v1/merchant`, auth par headers `X-API-Key` + `X-API-Secret`,
> webhook signé `HMAC-SHA256(timestamp + "." + corps_brut, whsec)`. Sandbox disponible.
> Provider câblé et webhook écrit le 2026-07-17 (41 tests) ; reste à poser les clés.
>
> ⚠️ **Les 6 réglages `PAYDUNYA_*` restent dans `config.py`** bien qu'aucun code ne les
> lise. Les retirer ferait **échouer le boot** : `pydantic-settings` refuse les champs
> non déclarés, et les `.env` existants contiennent encore ces lignes — même mode de
> défaillance que le `.env` corrompu de l'audit. Retrait sûr **en deux temps** : purger
> les lignes de chaque `.env`, PUIS supprimer les champs. Jamais l'inverse.
> *(Vérifié : la suppression directe casse `Settings()` — `extra_forbidden`.)*
>
> *Ironie à retenir : cette section dénonçait des CDC « périmés » tout en le devenant
> elle-même sur exactement le même point. Un document n'est pas fiable parce qu'il est
> bien écrit — il l'est parce qu'on le vérifie contre le code.*

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

**Reste bloquant avant prod** (état au 2026-07-17 — voir [`ETAT.md`](ETAT.md)) :
1. **Livraison des billets sans retry** — client payé + Resend indisponible = billet jamais reçu.
   Le vrai risque du jour J (T3.10).
2. **Aucun backup** — une billetterie sans sauvegarde perd la liste des payants.
3. **Aucune observabilité** — Sentry différé : rien ne dira ce qui casse.
4. **Pas déployable** — ni `compose.prod`, ni Dockerfile frontend ; le backend tourne en root.
5. **Clés GeniusPay à poser** — le digital est câblé mais le stub reste actif tant qu'elles
   manquent (le boot le logge).

*Résolus depuis l'audit : tests (33 → 153), CI (build + couverture + `pip-audit` bloquants),
dépendances (36 → 2 advisories), paiement digital (câblé), 4 failles de sécurité.*

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

### E2E (Playwright) — tunnel d'achat
Prérequis : stack Docker up + frontend dev (:3000) + événement `e2e-forum` semé.
```bash
npm --prefix e2e install                                   # 1re fois
npm --prefix e2e exec -- playwright install chromium        # 1re fois (navigateur)
npm --prefix e2e run test
```

---

## 4. Plan par chantiers (séquence valeur/risque)

> ⚠️ **Tableau recalé le 2026-07-17.** L'état fait foi dans [`ETAT.md`](ETAT.md) ;
> le séquencement dans [`ROADMAP_REMEDIATION.md`](ROADMAP_REMEDIATION.md) (sprints S0→S4).

| # | Chantier | État |
|---|---|---|
| 1 | Sécurité socle | 🟢 **Terminé (S2)** — 36 → **2 advisories** (les 3 atteignables sans auth ont disparu) ; écrasement de participant, fuite PII, Turnstile silencieux et IP d'audit falsifiable : fermés. Reste : sanitisation backend + Next 16 (S4) |
| 2 | Paiement complet | 🟡 **GeniusPay câblé** — provider + webhook signé + 41 tests ; `payment.refunded` traité. Barème des frais extrait et testé. **Reste : poser les clés (+ le `whsec_` sandbox) et un tunnel pour tester en local** |
| 3 | Intégration front↔back | 🟢 **Terminé** (admin + public + WS temps réel + ISR étendue + next/image ; reste : endpoint comms externe) |
| 4 | Livraison billets & comms | 🟡 **email_service (Resend) + WhatsApp écrits** — mais **AUCUN retry** : client payé + Resend down = billet jamais reçu. C'est le vrai risque du jour J (T3.10) |
| 5 | DevOps / prod | 🔴 **S3 — le prochain sprint.** compose prod, Dockerfile front (le back tourne en **root**), nginx/SSL, **backups (aucun)**, `/health` réel, limiter Redis. ⏸️ Sentry différé : **rien ne dira ce qui casse en prod** |
| 6 | Tests & QA | 🟢 **153 tests verts** (33 → 153), les nouveaux **mutation-testés**. CI : `build` + couverture **60 %** + `pip-audit` **bloquants**. ⚠️ Les « 32 verts » annoncés jusqu'ici étaient **faux** : à la 1ʳᵉ exécution réelle, la suite était à **20 échecs**. Reste : e2e en CI, tests de charge |
| 7 | Déploiement + docs + formation | 🔴 À faire |
| v2 | Streaming live | 🟡 **Plus différé** — `live.py`, `live_notifier`, pages front existent. Le gate d'accès a été réparé (3 défauts, 0 test auparavant) |

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

**Polish (session 3) — validé end-to-end en live :**
- **WS notifications temps réel avec auth** ✅ : endpoint `GET /ws/admin/notifications` (monté sous
  `/ws`), authentifié par **ticket court-terme** — le JWT de session vit en cookie httpOnly, non
  transmis au handshake WS (connexion directe au backend, cross-origin). Flux : `GET /admin/ws-ticket`
  (BFF authentifié, rôles dashboard) émet un JWT `type=ws_ticket` (TTL 60 s, `create_ws_ticket`) ; le
  front l'échange puis se connecte avec `?ticket=`. Le handshake valide le ticket (`decode_ws_ticket`,
  type distinct d'`access`) + borne l'Origin, sinon ferme (1008). `notification_hub` (registre
  in-memory + broadcast robuste) ; **push sur soumission de paiement manuel** (`orders.py`), format
  partagé avec le seed (`manual_payment_notification`, dédup par `id`). Front : `adminSocketUrl`
  devient **async** (fetch ticket via le proxy), `useWebSocket` accepte une **fabrique async** (ticket
  frais à chaque reconnexion, backoff conservé).
  *Validé live : login → ticket (200) → WS `[accepted]` → paiement manuel public → notif
  « Awa Diallo — Standard (ria) » reçue en temps réel dans le panneau admin.*
  ⚠ Hub **single-process** : multi-worker (gunicorn) exigera un backplane Redis pub/sub (§7).
- **Revalidation ISR étendue** ✅ : `revalidate_service.revalidate_event_by_id(db, event_id)` (résout
  le slug) branché sur les 8 mutations de `formulas`, `cms` (content), `payment_config`, `chatbot_faqs`
  — plus seulement `event_draft`. *Validé live : `PATCH /admin/formulas/{id}` → `POST {frontend}/api/revalidate` 200.*
- **Suivi #2 next/image fermé** ✅ : `images.unoptimized = true` (les visuels — hero, logos, speakers,
  logo navbar — sont des URLs sur hôtes arbitraires ou des data-URLs saisies par l'admin, non
  optimisables sans allowlist wildcard = réouverture du DoS optimiseur §07). *Validé live : hero
  Unsplash (hôte hors ancienne allowlist) chargé (1600 px), `<img>` src direct, aucune image via
  `/_next/image`.*

### Chantier 6 — Tests 🟡 (démarré)
Suite `pytest` backend contre une **base de test Postgres dédiée** (`farahevent_test`), NullPool +
event loop de session pour l'isolation async, override d'auth pour le RBAC. **32 tests verts** :
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
- `test_ws_notifications.py` — ticket WS (round-trip + rejet d'un access-token comme ticket) / RBAC
  `/admin/ws-ticket` (manager 200, agent 403) / hub broadcast + purge des sockets mortes / **push
  réel** sur soumission de paiement manuel (format `manual_payment_notification`).

Lancement : `bash run_tests.sh`. Deps dans `requirements-dev.txt`.

**CI** : `.github/workflows/ci.yml` — job **backend** (service Postgres + `pytest`, 32 tests) + job
**frontend** (`npm ci` → `lint` → `typecheck`). **Poussée sur GitHub → les 2 jobs sont VERTS.**
Repo : https://github.com/william1mufassa/farahevent (branche `main`).
Correctif appliqué : le `package-lock.json` généré sous Windows omettait des deps transitives
(`@emnapi/core`, `@emnapi/runtime`, `@swc/helpers`) requises par `npm ci` sous Linux → régénéré
multi-plateforme.

**E2E (Playwright)** : projet **isolé `e2e/`** (n'impacte pas le lockfile frontend / la CI).
**3 tests verts** sur le tunnel d'achat public : landing (données réelles), navigation vers l'achat,
et **achat manuel complet** (remplir le formulaire → `POST /orders/` → commande créée → redirection
`/paiement/manuel?order_id=…`). Nécessite la stack up + l'événement `e2e-forum` semé.
À faire : job **e2e en CI** (nécessite backend+frontend up) et **tests de charge**.

---

## 6. Ce qui reste à faire

### Chantier 3 (reste)
- **Communications** — `GET /admin/communications/recipients` + `POST /admin/communications/send`
  (dépend de Brevo + OpenWA — externe).
- **WS multi-worker** — le hub `notification_hub` est in-memory (single-process). Avant de passer
  gunicorn en multi-workers, ajouter un **backplane Redis pub/sub** (sinon un broadcast n'atteint
  que les sockets du worker courant). Cf. §7.
- **Robustesse `hero_image_url` vide** — les templates Hero passent `<Image src="">` quand l'event
  n'a pas de couverture → warning React (`preload` href vide) + « Image missing src ». Prévoir un
  fallback (couleur/gradient) ou omettre l'`<Image>` si l'URL est vide.

*(Faits en session 3, cf. §5 Polish : WS notifications avec auth, suivi #2 next/image, revalidation ISR étendue.)*

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

> **Recalé le 2026-07-17.** Ce tableau listait de la dette réelle — mais il en **omettait
> l'essentiel**, parce qu'il avait été rédigé sans jamais exécuter la stack. Les défauts
> ci-dessous n'ont été trouvés qu'en lançant le code :
>
> | Trouvé en exécutant | Pourquoi invisible à la lecture |
> |---|---|
> | Le backend **ne démarrait pas** (`.env` mixte UTF-8/UTF-16) | il fallait tenter le boot |
> | Migration `live_links_sent` **manquante** → `live_notifier` plantait en boucle | la suite construit le schéma via `create_all` depuis le **modèle**, jamais via Alembic — un oubli de migration y est **structurellement invisible**, en test comme en CI |
> | Le handler d'erreur de la réconciliation **plantait lui-même** (`MissingGreenlet` sur instance expirée) | il fallait déclencher le chemin d'erreur |
> | Tâche de livraison **collectable par le GC** (`create_task` sans référence) | comportement documenté d'asyncio, invisible en relecture |
> | Un test appelait le **vrai serveur OpenWA de production** | il fallait regarder le trafic |
> | `payment.refunded` **ignoré** → billet valide après remboursement | il fallait lire la config du tableau de bord GeniusPay |
> | La suite était à **20 échecs**, pas « 32 verts » | il fallait la lancer |

| Sujet | État |
|---|---|
| Tests automatisés | 🟢 **153 tests backend verts** (33 → 153), les nouveaux **mutation-testés** ; couverture **64 %** (seuil CI 60 %) ; + Playwright e2e (3) ; restent **e2e-en-CI + tests de charge** |
| **Suite aveugle aux migrations oubliées** | 🔴 `conftest` construit le schéma via `Base.metadata.create_all` (modèle), jamais via Alembic → prod cassée / CI verte. Angle mort structurel |
| **Pas de mock des dépendances externes** | 🟠 un test joignait la prod ; neutralisé au cas par cas, aucune stratégie globale |
| **Livraison sans retry** (`send_tickets_bg`) | 🔴 client payé + Resend down = billet jamais reçu, seule alerte = notif WS en direct. **Vrai risque du jour J** (T3.10) |
| Dépendances vulnérables | 🔴 36 advisories py — jose/multipart/starlette **atteignables sans auth** ; 4 high npm (menace réelle < chiffre brut, cf. `ETAT.md`) |
| Backups PostgreSQL | 🔴 **aucun** |
| **WS notifications single-process** (hub in-memory) | 🟡 multi-worker gunicorn ⇒ backplane **Redis pub/sub** requis (§6) |
| Templates : `<Image src="">` si `hero_image_url` vide (warning preload/src) | 🟡 fallback à prévoir (§6) |
| CI/CD | 🟢 **CI verte sur GitHub** (backend pytest + front lint/typecheck) ; restent Dockerfile frontend + compose prod (déploiement) |
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

### 2026-07-17 — Sprint S2 : durcissement (153 tests, 36 → 2 advisories)
- **Dépendances : 36 → 2 advisories.** `python-jose` 3.3→3.4 (confusion d'algo + DoS ; c'est la
  brique qui signe l'auth admin ET les billets QR). `fastapi` 0.111→**0.139.2** : 0.111 épinglait
  `starlette` 0.37 et ses 9 advisories ; starlette 1.3.1 les lève toutes. `python-multipart`
  0.0.9→0.0.31 (7 advisories, DoS atteignable via l'upload public). `Pillow` 11.1→12.3.
  **Les 3 paquets atteignables sans authentification ont disparu.** Le saut de 28 versions
  mineures de FastAPI est passé sans une casse — les 109 tests ont servi exactement à ça.
  **2 restantes, bloquées et documentées** : `ecdsa` (aucun correctif publié) et `pyasn1`
  (0.6.3 existe mais `python-jose` épingle `pyasn1<0.5.0` — vérifié, le forcer casse la
  résolution). Vrai correctif = migrer vers **PyJWT**, qui ne dépend ni de l'un ni de l'autre.
- **CI qui mord.** `npm run build` **ajouté** — il manquait : lint et typecheck ne compilent pas,
  une régression de build passait la CI et n'apparaissait qu'au déploiement. Couverture mesurée
  (**64 % réel**) → seuil bloquant à 60 %. `pip-audit` bloquant, ajouté **après** le nettoyage
  (un scan branché sur une CI rouge se fait désactiver dans la semaine). `npm audit` non bloquant
  et assumé : les 4 high de Next 14 n'ont aucun correctif en 14.x.
- **4 failles fermées**, toutes exploitables avec pour seule connaissance **l'email d'un acheteur** :
  - *Vol de billet par écrasement de participant* — `_upsert_participant` réécrivait le `whatsapp`
    d'un acheteur ayant déjà payé ; la re-livraison partait chez l'attaquant. Coordonnées **gelées**
    dès qu'un billet existe (la correction avant paiement reste permise — c'est testé).
  - *Fuite PII sur `/tickets/resend`* — la réponse renvoyait email **et téléphone en clair**.
    Masqués. + joker `ILIKE` fermé (`order_id="%"` matchait n'importe quel billet).
  - *Turnstile silencieux* — `verify` fait `if not self.enabled: return True` : sans clé, **tout
    jeton passe**, sans le moindre log. Exigé par le boot-guard en prod (qui gagne 12 tests, il
    n'en avait aucun).
  - *IP d'audit inutile et falsifiable* — le proxy BFF ne relayait rien (toutes les actions
    portaient l'IP du serveur Next) et le backend lisait `x-forwarded-for` **brut**, que nginx
    **ajoute** : la 1ʳᵉ entrée vient du client. On fait désormais confiance à `X-Real-IP`, qu'nginx
    **écrase** avec `$remote_addr`.
- **Garde anti-mock au build** — `next.config.mjs` refuse un build prod avec `USE_MOCK=1`
  (fixtures servies + garde admin désactivée). Next inline les `NEXT_PUBLIC_*` au build : le
  comportement est figé dans le bundle.
- **Barème des frais extrait** dans `pricing_service` — il vivait dans le handler HTTP, donc
  n'était pas testé alors qu'il décide de ce que l'acheteur paie. Neutralité du refactor prouvée
  sur 399 602 prix (0 écart). *NB : le `float` sur l'argent n'était **pas** un bug — 0 écart
  contre un calcul Decimal exact sur la même plage. Une odeur, pas une faute.*
- ⏸️ **Sentry différé** (décision du 2026-07-17). Assumé, mais **rien ne dira ce qui casse en
  prod** — à reprendre avant le 1er événement.

### 2026-07-17 — Sprint S1 : GeniusPay câblé, Live réparé, destruction tracée (109 tests)
- **GeniusPay branché** (D1 : PayDunya abandonné). Le provider existait, bien écrit, mais
  n'était **relié à rien** : il lisait `settings.GENIUSPAY_BASE_URL`, une clé jamais déclarée
  (`AttributeError` avant tout appel réseau) ; `payment_provider` restait `StubPaymentProvider()` ;
  aucune route webhook n'existait. Ajoutés : `_select_provider()` (+ WARNING au boot si le stub
  prend le relais — un `.env` incomplet ne criait pas), `verify_webhook_signature` sur l'ABC en
  **fail-closed**, `POST /webhooks/geniuspay` (HMAC corps brut + anti-rejeu 5 min + idempotence
  + livraison après commit).
- **4 écarts au contrat** corrigés en confrontant le code à la doc GeniusPay : `mobile_money`
  n'existe pas chez eux (→ `pawapay`, auto-routage par le numéro) ; `card` était valide (remap
  vers `paystack` inutile) ; objet `customer` jamais envoyé ; minimum 200 XOF non validé.
  **Frais réels** (`fees`/`net_amount`) désormais stockés — l'estimation locale (3,5 % + 100 F)
  garantissait un écart comptable.
- **`payment.refunded` était ignoré** : la garde d'idempotence l'avalait → argent rendu, place
  jamais libérée, **billet toujours valide**. `refund_service` partagé avec l'endpoint admin.
- **Gate Live réparé** — 3 défauts, 0 test auparavant : `MANUAL_VALIDATED` exclu (donc **aucun
  client réel** ne pouvait entrer) ; décision sur `event.mode` au lieu de `formula.channel`
  (fuite de revenu) ; joker `ILIKE` (`ref="%"` matchait tout billet).
- **`/admin/database` sécurisé** : audit sur les 3 routes, `SUPER_ADMIN` seul sur hard-delete,
  409 si ventes réelles, intégrité FK réparée. **Les 13 modules de mutation admin sont tracés.**
- **Upload borné** : purge des reçus orphelins (croissance disque non bornée) + rate limit 20/h
  (et non 3/h : le NAT mobile ivoirien fait partager une IP à des dizaines d'acheteurs).
- **Défaut de paiement inversé** — `_load_payment_config_or_default` ouvrait le digital et
  **fermait le manuel** : tout nouvel événement n'acceptait que la voie cassée.
- Docs : `ETAT.md` (point d'entrée, ~1,9k tok) + `ROADMAP_REMEDIATION.md` (5 sprints).

### 2026-07-16 — Sprint S0 + audit complet (11 dimensions, 5,5/10)
- **Le backend ne démarrait pas** : `.env` en encodage mixte UTF-8 + UTF-16LE (PowerShell
  `Add-Content` sans `-Encoding utf8`) → `ValidationError` pydantic. Piège : le volume du compose
  monte le fichier dans le conteneur, `.dockerignore` ne filtre que le contexte de build.
- **97 fichiers non commités** (3 jours de travail, une seule machine) → 5 commits poussés.
- **3 bugs trouvés en exécutant** : migration `live_links_sent` manquante (`live_notifier`
  plantait en boucle) ; handler d'erreur de la réconciliation qui plantait lui-même ; tâche de
  livraison collectable par le GC.
- **Les tests n'étaient pas « 32 verts » mais à 20 échecs.** La base de test périmée + `create_all`
  (qui n'altère jamais une table existante) les masquait.
- `infra/nginx/farahevent.conf` **rapatrié** — la config nginx de prod n'existait qu'en copie
  unique hors dépôt.

### 2026-07-13 — Chantier 3 (polish) terminé & validé end-to-end en live
- **WS notifications temps réel avec auth** ✅ — endpoint `/ws/admin/notifications` + **ticket
  court-terme** (`type=ws_ticket`, TTL 60 s) émis via le BFF (`GET /admin/ws-ticket`), hub in-memory
  (`notification_hub`), push sur soumission de paiement manuel. Front : `adminSocketUrl` async +
  `useWebSocket` à fabrique async (ticket frais par reconnexion). *Validé live : notif
  « Awa Diallo — Standard (ria) » reçue en temps réel après un paiement manuel public.*
- **Revalidation ISR étendue** ✅ — `revalidate_event_by_id` sur `formulas`/`cms`/`payment_config`/
  `chatbot_faqs` (8 mutations). *Validé live : `PATCH` formule → `POST /api/revalidate` 200.*
- **Suivi #2 next/image fermé** ✅ — `images.unoptimized = true`. *Validé live : hero Unsplash (hôte
  hors ancienne allowlist) affiché (1600 px), hors optimiseur.*
- **Tests 25 → 32** — `test_ws_notifications.py` (ticket, RBAC, hub, push). Handshake WS réel validé
  (refus sans/mauvais ticket ou access-token, accept avec ticket valide). Stack Docker : boot OK, 32/32 verts.
- **Poussé en début de session** : `a9f19b1` (`e2e/` + `SUIVI_PROJET.md`, cf. entrée ci-dessous).
- ⚠ Chantier 3 (code ci-dessus) **pas encore commité/poussé**.

### 2026-07-13 — fin de session
- **Point de reprise** ajouté (§0) — travail local non commité listé, prochaines actions séquencées.
- **Playwright e2e** : projet isolé `e2e/`, 3 tests verts (landing, navigation, achat manuel complet
  → commande créée + redirection). Événement `e2e-forum` semé pour des données déterministes.
  ⚠ `e2e/` pas encore commité/poussé.
- **Poussé sur GitHub** (william1mufassa/farahevent, `main`, commit `da6ad4a`) → **CI verte**
  (backend pytest 25/25 + frontend lint/typecheck). Correctif lockfile multi-plateforme
  (deps @emnapi/@swc manquantes sous Linux).
- **Couverture backend étoffée** : 9 → **25 tests** (commande publique, finances, dashboard,
  transitions de statut, 2FA login anti-lockout, participants).
- **CI écrite** : `.github/workflows/ci.yml` (backend pytest + Postgres, frontend lint/typecheck).
- **Chantier 6 démarré** : suite `pytest` backend (25 tests verts) sur base de test dédiée —
  billets/anti-oversell, réconciliation, paiement manuel HTTP, RBAC, scan QR single-use, commandes
  publiques, finances, dashboard, statuts event, 2FA, participants.
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
