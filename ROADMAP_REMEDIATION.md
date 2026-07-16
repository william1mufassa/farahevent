# Roadmap de remédiation — FarahEvent

> Issue de l'audit du **2026-07-16** (11 dimensions, note globale 5,5/10, 5 bloquants vérifiés
> empiriquement). Construite avec IRON System — Mode C (AUDIT → SYNTHESIZE → BUILD), loop SCAFFOLD.
>
> **Ce document se branche sur `SUIVI_PROJET.md`**, il ne le remplace pas. Le mapping avec les
> chantiers existants est indiqué à chaque sprint. Mettre `SUIVI_PROJET.md` à jour en fin de sprint.

---

## 0. Principe directeur

L'audit a montré que **le code n'est pas le problème** : anti-oversell par verrou pessimiste,
ticket WS à TTL court, boot-guard prod, validation par magic bytes, CSP raisonnée ligne par ligne
— c'est du travail d'ingénieur. **Le problème est la chaîne de livraison** : du code écrit plus vite
qu'il n'est intégré, poussé et vérifié.

La roadmap découle de ce diagnostic. Elle n'ajoute presque aucune fonctionnalité. Elle **finit**
ce qui existe.

**Règle de séquencement** : un sprint ne démarre pas tant que le précédent n'a pas passé sa
*Definition of Done*. Les gates ne sont pas décoratifs — ils encodent des dépendances réelles
(on ne peut pas vérifier un correctif si l'app ne démarre pas ; on ne peut pas refactorer
sereinement si rien n'est commité).

---

## 1. Vue d'ensemble

| Sprint | Nom | Durée | Gate de sortie | Chantier `SUIVI_PROJET.md` |
|---|---|---|---|---|
| **S0** | Reprise en main | **2 h** | App démarre + travail poussé + CI verte | — (prérequis) |
| **S1** | Décision & vérité | 3–5 j | Une voie d'encaissement fonctionne de bout en bout | 2 (finir) + 3 (reste) |
| **S2** | Durcissement | 5–8 j | Aucun bloquant sécurité ouvert ; CI qui mord | 1 (reprise) + 6 |
| **S3** | Livrable | 8–12 j | Déployable + restaurable + observable | 5 |
| **S4** | Mise en prod | variable | Premier événement encaissé | 4 + 7 |

**Budget total S0→S3 : ~4 à 6 semaines** pour un solo à temps partiel. S0 = 2 h et élimine
le risque le plus grave du projet.

---

## 2. SPRINT 0 — Reprise en main

> **Objectif** : le projet démarre, et il existe ailleurs que sur ce portable.
> **Durée : 2 h. À faire aujourd'hui, avant toute autre chose.**

### Pourquoi ce sprint existe

Deux faits vérifiés rendent tout le reste impossible :
1. `python -c "import app.main"` → `ValidationError`. **Le backend ne démarre pas.**
2. 79 fichiers non commités (~2 364 insertions) depuis `e914b94` (2026-07-13). **3 jours de
   travail n'existent que sur une machine** — dont Live, GeniusPay, email, `admin/database.py`.

Tant que ces deux points tiennent, aucun correctif n'est vérifiable et tout est perdable.

### Tâches

| ID | Tâche | Détail | Temps |
|---|---|---|---|
| **T0.1** | Réparer `.env` | Encodage mixte UTF-8 + UTF-16LE (chunk `RESEND_API_KEY=` à l'offset 1515, 53 octets nuls). Cause : PowerShell `Add-Content`/`Out-File` sans `-Encoding utf8`. | 5 min |
| **T0.2** | Vérifier le boot | `docker compose -f docker-compose.dev.yml up --build -d` → `/health` = 200, `/docs` accessible. | 10 min |
| **T0.3** | Vérifier les tests | `bash run_tests.sh` → confirmer les 33 tests. **Ne pas croire la doc sur parole.** | 10 min |
| **T0.4** | Découper les 79 fichiers | 4 commits cohérents, pas un « WIP » géant (cf. découpage ci-dessous). | 1 h |
| **T0.5** | Pousser + CI | `git push` → les 2 jobs GitHub Actions verts. | 15 min |
| **T0.6** | Purger les artefacts | `update.zip`, `src.tar.gz`, `tsconfig.tsbuildinfo` : supprimer ou gitignorer. | 10 min |

**T0.1 — commande :**
```bash
cd farahevent-backend
python - <<'EOF'
raw = open('.env','rb').read()
clean = raw.replace(b'\x00', b'')
open('.env','wb').write(clean)
print('octets nuls retirés :', raw.count(b'\x00'))
EOF
python -c "from app.core.config import settings; print('config OK')"
```

Puis **prévenir la récidive** — c'est la vraie correction :
```gitattributes
# .gitattributes
*.env text eol=lf
```
> ⚠️ Ne **jamais** utiliser `Add-Content` / `Out-File` sur un `.env` sans `-Encoding utf8`.
> C'est exactement ce qui a cassé le boot.

**T0.2 — piège à connaître :** `.dockerignore` exclut bien `.env`, **mais `docker-compose.dev.yml`
monte `./farahevent-backend:/app` en volume**. `.dockerignore` ne filtre que le *contexte de build*,
jamais les volumes → le `.env` corrompu entre aussi dans le conteneur. Réparer le fichier suffit ;
à terme, retirer le `.env` du dossier monté.

**T0.4 — découpage proposé** (4 commits qui racontent une histoire lisible) :
```
feat(live): page live + accès participant + notifier
  → live.py, schemas/live.py, live_notifier.py, security.create_live_token,
    front: (public)/live/[slug]/, components/live/, LiveAccessForm.tsx

feat(delivery): service email Resend + statuts de livraison des billets
  → email_service.py, migration add_ticket_delivery_status,
    ticket_service.send_tickets_bg, models/ticket.py

feat(admin): endpoints base de données + page associée
  → admin/database.py, router.py, front: (admin)/admin/base-de-donnees/

wip(payment): provider GeniusPay — NON câblé, config incomplète
  → geniuspay_provider.py + un commentaire d'en-tête disant explicitement
    que c'est mort tant que S1 n'a pas tranché
```

> Le 4ᵉ commit est volontairement honnête. Un `wip(...)` qui dit « ceci ne marche pas »
> vaut mieux qu'un `feat(...)` qui laisse croire l'inverse — c'est précisément la dérive
> qui a produit l'écart doc/réalité.

### Definition of Done — S0

- [ ] `git status` propre, `git push` fait, branche `main` à jour
- [ ] CI GitHub Actions : les 2 jobs verts
- [ ] `docker compose up` → `/health` 200
- [ ] `bash run_tests.sh` → tous verts, **nombre réel noté** dans `SUIVI_PROJET.md`
- [ ] `.gitattributes` protège les `.env`

**🚦 GATE 0 — Rien ne démarre tant que ces 5 cases ne sont pas cochées.**

---

## 3. SPRINT 1 — Décision & vérité

> **Objectif** : une voie d'encaissement fonctionne de bout en bout, et la doc redevient vraie.
> **Durée : 3–5 j.** Mapping : Chantier 2 (finir) + Chantier 3 (reste).

### D1 — La décision qui gouverne le sprint

**Question : les credentials sandbox GeniusPay sont-ils disponibles sous 7 jours ?**

C'est la seule question à laquelle je ne peux pas répondre à votre place, et elle change tout.

```
                    ┌─────────────────────────────┐
                    │  Creds GeniusPay < 7 jours ? │
                    └──────────┬──────────────────┘
                    OUI ───────┴─────── NON
                     │                   │
              ┌──────▼──────┐     ┌──────▼───────────────┐
              │ BRANCHE GO  │     │ BRANCHE MANUEL-ONLY  │
              │  T1.1 (2 j) │     │  T1.1bis (2 h)       │
              └─────────────┘     └──────────────────────┘
```

**Ne pas trancher est le pire choix.** Aujourd'hui le système est dans un troisième état —
« à moitié intégré » — qui combine les inconvénients des deux : du code mort dans le chemin
de paiement, et aucun encaissement digital.

#### Rappel du diagnostic — le digital est mort à 4 niveaux indépendants

| # | Défaut | Preuve |
|---|---|---|
| 1 | Clés de config inexistantes | `geniuspay_provider.py` lit `settings.GENIUSPAY_BASE_URL` (l. 93, 118) et `GENIUSPAY_WEBHOOK_SECRET` (l. 141) ; `config.py` déclare `GENIUSPAY_API_URL` / `GENIUSPAY_WEBHOOK_URL` → `AttributeError` |
| 2 | Provider jamais câblé | `payment_provider.py:91` → `payment_provider: PaymentProvider = StubPaymentProvider()`. `GeniusPayProvider` n'est **importé nulle part** (corroboré par graphify : communauté isolée) |
| 3 | Aucune route webhook | `webhooks.py` n'a qu'un `/paydunya` → 501. `orders.py:129` pointe vers `/webhooks/stub`, inexistant |
| 4 | Signature hors contrat | `verify_webhook_signature` n'est pas sur l'ABC `PaymentProvider` |

> ⚠️ **Piège pydantic** : `pydantic-settings` v2 refuse les champs extra (`extra='forbid'` —
> c'est ce qui fait planter le `.env`). Ajouter `GENIUSPAY_BASE_URL` au `.env` **ne suffit pas** :
> il faut le **déclarer dans `config.py`**, sinon le boot échoue.

### Tâches — communes aux deux branches

| ID | Tâche | Pourquoi maintenant | Temps |
|---|---|---|---|
| **T1.0** | 🔴 Inverser le défaut de `_load_payment_config_or_default` | `orders.py:350` met `is_digital_enabled=True, is_manual_enabled=False` → **tout nouvel événement n'accepte que la voie cassée**. 1 ligne, impact maximal. | 5 min |
| **T1.2** | Réparer le gate Live | `live.py:69` exclut `MANUAL_VALIDATED` → comme le digital est stubbé, **aucun client réel ne peut accéder au Live**. Et l. 73 teste `event.mode` au lieu de `formula.channel` (TODO l. 76) → un acheteur présentiel-only d'un event hybride obtient le Live = fuite de revenu. Les 2 bugs se masquent aujourd'hui. | 1 h |
| **T1.3** | Rate-limiter `/orders/{id}/manual-payment` | Upload **anonyme sans limite**. `save_receipt` écrit un fichier UUID neuf à chaque appel, la ligne DB est écrasée → fichiers orphelins jamais purgés → saturation disque. C'est aussi le chemin des CVE multipart. | 30 min |
| **T1.4** | Sécuriser `/admin/database` | Seul module de mutation admin **sans `audit_service`** (vérifié sur les 12 autres). `hard_delete` accessible au rôle MANAGER. Zéro test. Modifier une FAQ est tracé, détruire un événement ne l'est pas. | 2 h |
| **T1.5** | Remettre `SUIVI_PROJET.md` en phase | La doc cite PayDunya (le code a GeniusPay), ignore Live/email/database, et affirme « Chantier 3 terminé & validé » pour du code non commité. | 1 h |

**T1.2 — le correctif :**
```python
# live.py:69 — aligner sur la convention du reste du code
if order.status not in (OrderStatus.PAID.value, OrderStatus.MANUAL_VALIDATED.value):
    raise HTTPException(status_code=403, detail="Votre billet n'est pas encore payé")

# live.py:73 — vérifier le canal ACHETÉ, pas le mode de l'événement (ferme le TODO l.76)
formula = ...  # via order.formula_id
if formula.channel not in (FormulaChannel.ONLINE.value, FormulaChannel.BOTH.value):
    raise HTTPException(status_code=403, detail="Votre billet ne donne pas accès au Live")
```
> Note : la comparaison `str` / `Enum` elle-même est **correcte** (`OrderStatus` hérite de `str`).
> Ce n'est pas un bug d'enum — c'est un oubli de `MANUAL_VALIDATED`.

**T1.4 — les 3 corrections :**
```python
_super = require_roles(AdminRole.SUPER_ADMIN)          # hard-delete : super_admin SEUL

@router.delete("/events/{event_id}/hard-delete")
async def hard_delete_event(event_id, request: Request, admin=Depends(_super), db=...):
    ...
    paid = await db.scalar(select(func.count(Order.id)).where(
        Order.event_id == parsed,
        Order.status.in_([OrderStatus.PAID.value, OrderStatus.MANUAL_VALIDATED.value])))
    if paid:
        raise HTTPException(409, f"{paid} commande(s) payée(s) — suppression refusée")
    await audit_service.log(db, admin=admin, action="event.hard_delete",
                            resource_type="event", resource_id=event_id, request=request)
    await db.delete(e)
```
+ idem sur `reset_event_data` + tests (`test_database_admin.py`).

### Branche GO — T1.1 (2 j)

1. Déclarer dans `config.py` : `GENIUSPAY_BASE_URL` et `GENIUSPAY_WEBHOOK_SECRET` (+ `.env.example`).
   *Décider* : renommer les clés du provider vers `API_URL`/`WEBHOOK_URL` existantes, **ou** déclarer
   les nouvelles. Une seule source de vérité — pas les deux.
2. Remonter `verify_webhook_signature` sur l'ABC `PaymentProvider`.
3. Câbler : `payment_provider: PaymentProvider = GeniusPayProvider()`.
4. Écrire `POST /webhooks/geniuspay` : HMAC sur le **corps brut** (jamais un dict re-sérialisé —
   `verify_webhook_signature` fait déjà ça correctement) + idempotence + `ticket_service`.
5. Tests : IPN simulé signé (valide / signature fausse / rejeu) — **validable sans creds réelles**.

### Branche MANUEL-ONLY — T1.1bis (2 h)

1. `git rm farahevent-backend/app/services/geniuspay_provider.py` (il reste dans l'historique).
2. Purger la config morte : `PAYDUNYA_*` (6 clés), `BREVO_*` (3 clés — le code utilise Resend).
3. Supprimer `/payments` et `/webhooks/paydunya` (501 exposés publiquement).
4. Acter dans `SUIVI_PROJET.md` : « 1er événement = manuel uniquement ; digital = post-lancement ».
5. Soigner l'UX du tunnel manuel — **c'est le produit maintenant**, plus un pis-aller.

> **Recommandation.** Si le doute existe, prenez MANUEL-ONLY. Le paiement manuel est déjà
> votre vrai différenciateur (la diaspora qui paie par Western Union), il fonctionne, il est testé
> (`test_manual_payments_http.py`, `test_orders_public.py`). Un premier événement encaissé en
> manuel vaut infiniment mieux qu'un digital à moitié branché qui bloque le lancement.

### Definition of Done — S1

- [ ] D1 tranchée et **écrite** dans `SUIVI_PROJET.md`
- [ ] Un tunnel d'achat complet **exécuté à la main** : achat → billet reçu → QR scanné
- [ ] `/live/access` accepte un billet manuel validé ; refuse un billet présentiel-only
- [ ] `/admin/database` : audité, `SUPER_ADMIN` sur hard-delete, tests verts
- [ ] Aucun endpoint public non rate-limité qui écrit sur disque
- [ ] `SUIVI_PROJET.md` décrit le système réel

**🚦 GATE 1 — Une voie d'encaissement fonctionne de bout en bout, vérifiée manuellement.**

---

## 4. SPRINT 2 — Durcissement

> **Objectif** : plus aucun bloquant sécurité ouvert, et une CI qui mord.
> **Durée : 5–8 j.** Mapping : Chantier 1 (reprise) + Chantier 6.

| ID | Tâche | Preuve d'audit | Effort |
|---|---|---|---|
| **T2.1** | `python-jose` → 3.4.0 | `PYSEC-2024-232` (confusion d'algo) + `PYSEC-2024-233` (DoS). Signe **toute l'auth admin + les billets QR**. Atténuation existante : `algorithms=[...]` épinglé partout → confusion neutralisée ; le DoS reste atteignable via n'importe quel Bearer forgé. | rapide |
| **T2.2** | `python-multipart` → 0.0.31 + `starlette` (⇒ bump FastAPI) | 7 + 9 advisories. **Atteignables sans auth** via l'upload de `/orders/{id}/manual-payment`. Le plus lourd du sprint : FastAPI 0.111 épingle starlette 0.37.x. | moyen |
| **T2.3** | Stopper l'écrasement de participant | `orders.py:379-387` : `_upsert_participant` écrase `whatsapp`/nom depuis une entrée **anonyme**. Qui connaît l'email d'un acheteur remplace son numéro → les billets re-livrés partent chez l'attaquant. | rapide |
| **T2.4** | Fuite PII sur `/tickets/resend` | La réponse renvoie `participant.whatsapp` en clair. Aggravé par `tickets.py:204` : `ilike(f"%{ref_input}")` — `%` reste un joker, `order_id="%"` matche tout billet. (Pas d'injection SQL : SQLAlchemy paramètre la valeur.) | rapide |
| **T2.5** | Turnstile dans le boot-guard | No-op silencieux si `TURNSTILE_SECRET_KEY` vide, et le boot-guard **ne l'exige pas en prod** → prod sans anti-bot, sans signal. | rapide |
| **T2.6** | XFF dans le proxy BFF | Le proxy reconstruit les headers à zéro (`new Headers()`) → aucun `x-forwarded-for` n'atteint le backend → `audit_service` logge l'IP du serveur Next. **Toutes les actions admin ont la même IP inutile.** | rapide |
| **T2.7** | Journaliser les scans forgés | `tickets.py:47` logge avec `event_id=None`, or `_log_scan` fait `if not event_id: return` (l. 261) → une campagne de QR forgés est **invisible**. | rapide |
| **T2.8** | CI qui mord | Ajouter `npm run build` (absent !), `pip-audit`, `npm audit --audit-level=high`, `pytest-cov` seuil 60 %. | rapide |
| **T2.9** | Sentry back + front | Zéro observabilité aujourd'hui. C'est ce qui vous dira ce qui casse le jour J. | rapide |
| **T2.10** | Extraire le pricing | `orders.py:84-97` : `import math` **dans** la fonction, frais en dur (3,5 % + 100/200 FCFA), **estimés** et facturés au client. Du calcul financier dans un handler HTTP. | rapide |
| **T2.11** | Garde anti-mock au build | `.env.local` a `NEXT_PUBLIC_USE_MOCK=1`, et **Next charge `.env.local` en production**. Avec `USE_MOCK=1` : garde middleware neutralisée + `auth.tsx:35` fabrique un faux `super_admin`. Sain en `git clone` (fichier gitignoré) — **dangereux en copie de dossier**, la méthode actuelle. | rapide |
| **T2.12** | `/docs` off en prod | OpenAPI public. | rapide |

**T2.11 — la garde :**
```js
// next.config.mjs
if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_USE_MOCK === '1') {
  throw new Error('Build prod avec USE_MOCK=1 — refusé (mock + garde admin désactivée).');
}
```
> Le vrai correctif de fond est ailleurs : **déployer par `git clone`, pas par copie de dossier.**
> C'est aussi ce qui règle l'imbriquement à 4 niveaux et les `update.zip`/`src.tar.gz` embarqués.

**T2.10 — nuance business** : les frais sont **estimés**, jamais réconciliés avec les frais réels
du provider. À l'échelle, écart comptable garanti. À traiter avec la branche GO de S1.

### Definition of Done — S2

- [ ] `pip-audit` : plus aucune vuln **atteignable sans auth** (jose, multipart, starlette)
- [ ] CI : build + audit + couverture ≥ 60 % — et la CI **échoue** si le seuil casse
- [ ] Sentry reçoit une erreur de test depuis les 2 apps
- [ ] Un build prod avec `USE_MOCK=1` **échoue**
- [ ] Les logs d'audit portent la vraie IP admin

---

## 5. SPRINT 3 — Livrable

> **Objectif** : déployable, restaurable, observable. **Durée : 8–12 j.** Mapping : Chantier 5.

| ID | Tâche | Détail |
|---|---|---|
| **T3.1** | Dockerfile durci | Aujourd'hui : **root**, pas de multi-stage (gcc + libpq-dev dans l'image finale), pas de `HEALTHCHECK`, pas de `PYTHONUNBUFFERED=1` (**logs bufferisés = invisibles en conteneur**), base non épinglée par digest. |
| **T3.2** | Dockerfile frontend | N'existe pas. |
| **T3.3** | `docker-compose.prod.yml` | N'existe pas. + gunicorn/uvicorn workers. |
| **T3.4** | Versionner nginx | `farahevent_nginx.conf` vit **hors du dépôt**, à côté de copies libres qui **diffèrent** des versions du repo. → `infra/nginx/`. |
| **T3.5** | 🔴 Backups | **Rien aujourd'hui.** `pg_dump` quotidien chiffré hors-site **+ un test de restauration réel**. Un backup jamais restauré n'est pas un backup. |
| **T3.6** | Limiter sur Redis | `storage_uri=settings.REDIS_URL` — **avant** tout passage multi-worker, sinon le rate-limit est par worker donc contournable. |
| **T3.7** | Backplane WS Redis | Hub `notification_hub` in-memory → multi-worker exige un pub/sub. Dette déjà identifiée. |
| **T3.8** | `/health` réel | Ne teste pas la base : ment quand Postgres est tombé. |
| **T3.9** | e2e en CI | 3 tests Playwright existants, hors CI. |
| **T3.10** | Retry/DLQ livraison | `send_tickets_bg` : **aucun retry**. Client payé + Resend down = **billet jamais reçu**, et la seule alerte est une notif WS qu'un admin doit voir en direct. Inacceptable en prod. |

> **T3.10 est le vrai risque du jour J** : ce n'est pas un problème de perf, c'est « le client
> a payé et n'a pas son billet ». À traiter comme un bloquant business, pas comme du polish.
> Corriger aussi le domaine en dur `https://farahevent.tech/live/{slug}` (`ticket_service.py:173`)
> et la branche morte l. 204.

### Definition of Done — S3

- [ ] `docker compose -f docker-compose.prod.yml up` sur une VM vierge → site servi en HTTPS
- [ ] **Une restauration de backup a été testée** et le compte-rendu écrit
- [ ] Conteneurs non-root, healthchecks actifs
- [ ] e2e verts en CI

---

## 6. SPRINT 4 — Mise en prod

> Mapping : Chantiers 4 + 7.

| ID | Tâche | Note |
|---|---|---|
| **T4.1** | 🔴 Pages légales | CGV/CGU, confidentialité, mentions. **Avant le premier euro.** Vous vendez et collectez email/WhatsApp/pays/ville, y compris de résidents UE (diaspora) → **RGPD applicable** : consentement, rétention, droit à l'effacement. Non négociable. |
| **T4.2** | Analytics | Plausible/Umami. **Le taux d'abandon du tunnel est LA métrique d'une billetterie** — aujourd'hui invisible. |
| **T4.3** | Chantier 4 | Brevo/Resend + file Redis OpenWA + n8n (rappels J-7…J+7). |
| **T4.4** | Test de charge | Cible : 1 500 présentiel + 3 000 online. **Jamais éprouvée.** 100 achats concurrents d'abord. |
| **T4.5** | Lighthouse mobile | > 80 × 4 templates. Contexte 3G ivoirien + `images.unoptimized=true` → à mesurer avant de promettre. |
| **T4.6** | Sanitisation backend | Le commentaire de `sanitize.ts` affirme que le backend sanitise : **c'est faux** (aucune lib dans `requirements.txt`). Corriger le code **ou** le commentaire — un commentaire faux sur une propriété de sécurité est pire que pas de commentaire. |
| **T4.7** | Next 14 → 16 | Résorbe les 4 high npm. Breaking. **Menace réelle < chiffre brut** : 2 des 4 visent l'Image Optimization (déjà neutralisée par `unoptimized:true`), le « Middleware bypass » vise le Pages Router (le projet est en App Router). Donc : planifiable, pas urgent. |
| **T4.8** | Pipeline d'upload images | Débloque l'optimisation Next → vrai gain mobile. Lourd. |

---

## 7. Stress test de la roadmap (loop SCAFFOLD — étape 5)

Une roadmap qui n'a pas été attaquée est une liste de vœux. Voici où celle-ci casse.

| Attaque | Réponse |
|---|---|
| **« GeniusPay n'arrive jamais »** | D1 le prévoit : branche MANUEL-ONLY, 2 h. La roadmap ne dépend d'aucun tiers. |
| **« Je n'ai que 5 h/semaine »** | S0 = 2 h et supprime le risque majeur. S1 tient en 3–5 j. Les sprints sont indépendants **après** le Gate 0. |
| **« Une date d'événement tombe demain »** | Chemin minimal : S0 + T1.0 + T1.2 + T1.3 + T3.5 (backups) + T4.1 (légal). ≈ 4 j. Tout le reste peut attendre. |
| **« Le dev est indisponible »** | **Point de défaillance unique non résolu par cette roadmap.** S0 (push) le réduit de « perte totale » à « retard ». Aucune autre mitigation possible à un seul dev — à assumer explicitement. |
| **« S2 casse tout »** (bump FastAPI) | C'est pourquoi S2 vient **après** le Gate 1 : une chaîne d'encaissement vérifiée sert d'oracle de non-régression. Faire T2.2 sur une branche dédiée. |
| **« La roadmap est ignorée »** | Risque réel — c'est arrivé à `SUIVI_PROJET.md`, qui a dérivé du code. Mitigation : ce fichier vit **dans le dépôt**, à côté de `SUIVI_PROJET.md`, et chaque sprint impose de mettre celui-ci à jour dans sa DoD. |

**Faille structurelle assumée** : cette roadmap ne corrige pas le *processus* qui a produit la
dérive (coder plus vite qu'on n'intègre). Elle en corrige les *symptômes*. Le seul garde-fou
durable est le Gate 0 érigé en habitude : **pousser en fin de chaque session, sans exception.**

---

## 8. Tableau de bord

| Indicateur | Aujourd'hui | Après S1 | Après S2 | Après S3 |
|---|---|---|---|---|
| L'app démarre | ❌ | ✅ | ✅ | ✅ |
| Travail poussé | ❌ 79 fichiers | ✅ | ✅ | ✅ |
| Voie d'encaissement | ❌ 0 | ✅ 1 | ✅ 1 | ✅ 1–2 |
| Destruction tracée | ❌ | ✅ | ✅ | ✅ |
| Vulns sans auth | 🔴 3 paquets | 🔴 3 | ✅ 0 | ✅ 0 |
| Couverture mesurée | ❌ | ❌ | ✅ ≥60 % | ✅ ≥60 % |
| Backups testés | ❌ | ❌ | ❌ | ✅ |
| Observabilité | ❌ | ❌ | ✅ | ✅ |
| Déployable | ❌ | ❌ | ❌ | ✅ |
| **Note d'audit** | **5,5**/10 | ~6,5 | ~7,5 | ~8,5 |

---

## 9. Ce qu'il ne faut pas faire

- ❌ **Écrire du code neuf avant le Gate 0.** Le premier réflexe naturel est de « finir le Live ».
  Le Live ne démarre pas.
- ❌ **Croire la doc.** `SUIVI_PROJET.md` décrit PayDunya, ignore Live/email/database, et affirme
  « validé end-to-end » pour du code non commité. Vérifier dans le code.
- ❌ **Croire les commentaires.** `sanitize.ts` affirme une sanitisation backend qui n'existe pas.
- ❌ **Déployer par copie de dossier.** C'est ce qui transporte `.env.local` (`USE_MOCK=1`),
  `node_modules`, `update.zip`. Déployer par `git clone`.
- ❌ **Passer multi-worker** avant le limiter Redis (T3.6) et le backplane WS (T3.7).
- ❌ **Toucher au code sûr sans raison** : anti-oversell (`FOR UPDATE`), séparation des clés,
  ticket WS, magic bytes, CSP, `ThemeInjector`. C'est ce qui tient le système debout.

---

*Généré le 2026-07-16 — IRON System, Mode C, loop SCAFFOLD. Confiance : 8/10.*
*Sources : audit 11 dimensions + graphify (1654 nœuds / 4019 arêtes) + MemPalace (wing `farahevent_main`).*
