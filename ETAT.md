# ÉTAT — FarahEvent

> **Lire CE fichier en premier, et lui seul.** ~150 lignes ≈ **1 900 tokens** — contre ~6 800 pour
> `SUIVI_PROJET.md` (périmé) et le coût bien plus lourd d'une ré-exploration du code.
>
> **Dernière MAJ : 2026-07-17 · Session 4 · S0 ✅ S1 ✅ S2 ✅ (sauf Sentry) — prochain : S3**

---

## ⚡ Reprise en 30 secondes

FarahEvent = billetterie hybride (présentiel + live) pour la Côte d'Ivoire. FastAPI + Next.js 14,
~26k LOC, monorepo, **pré-production, 0 utilisateur réel**, dev solo.

**Le code est bon. La chaîne de livraison était le problème.** Audit du 2026-07-16 : 5,5/10,
5 bloquants vérifiés *par exécution*. **S0 clos** (app démarre, travail poussé, 74/74 verts) ;
**S1 clos** (GeniusPay câblé, Live réparé, destruction tracée) ; **S2 clos sauf Sentry**
(36 → 2 advisories, CI qui mord, 4 failles fermées). **153 tests.** Tout est sur la branche
`chantier/live-delivery-admin`, **jamais mergé sur `main`**.

**➡️ Prochaine action : S3 (livrable)** — Dockerfile durci, compose prod, **backups + test de
restauration**, et **T3.10 retry/DLQ** (le vrai risque du jour J). Voir `ROADMAP_REMEDIATION.md` §5.

---

## 🚦 État vérifié (2026-07-17)

| Fait | État | Preuve |
|---|---|---|
| Config charge | ✅ **OUI** | `.env` réécrit en UTF-8 (53 octets nuls retirés) |
| Backend démarre | ✅ **OUI** | `docker compose up` → **`/health` 200**, 0 erreur dans les logs |
| Schéma DB complet | ✅ **OUI** | migration `0004_live_links_sent` ajoutée (manquait) + réversibilité testée |
| Travail poussé | ✅ **OUI** | branche `chantier/live-delivery-admin`, 23 commits, sur `origin` — **jamais mergée sur `main`** |
| Tests | ✅ **153/153** | vérifié le 2026-07-17. 33 → 153. Tous les nouveaux sont **mutation-testés** (signature acceptant tout → 3 échecs ; idempotence retirée → 1 ; anti-rejeu retiré → 2) |
| CI | 🟡 **renforcée, non déclenchée** | `build` + couverture 60 % + `pip-audit` bloquants ajoutés. Ne tourne que sur `main` ou PR→`main` → **PR à ouvrir à la main** (`gh` absent) |
| Encaissement digital | 🟡 **câblé, clés absentes** | code + webhook + 41 tests ✅. Clés absentes du `.env` → **le boot logge « Paiement digital : STUB actif »** (vérifié). Dès que les clés sont posées, le log passe à « GeniusPay (mode=test) » — c'est le témoin à regarder |
| Encaissement manuel | ✅ OK | testé (`test_manual_payments_http.py`) — **seule voie qui marche** |
| Accès Live | ✅ **RÉPARÉ** | `MANUAL_VALIDATED` accepté, droit basé sur `formula.channel`, joker ILIKE fermé, rate limit — 10 tests |
| Destruction tracée | ✅ **OUI** | audit sur les 3 routes, `SUPER_ADMIN` seul, 409 si ventes réelles — **les 13 modules admin sont tracés** |
| Vulns sans auth | ✅ **0** | jose/multipart/starlette réglés. 36 → **2** advisories, ignorées avec raison écrite (ecdsa : aucun correctif ; pyasn1 : épinglé par python-jose). npm : 4 high sans correctif en 14.x → Next 16 en S4 |
| Backups | ❌ AUCUN | rien dans le dépôt — **S3** |
| Observabilité | ❌ AUCUNE | Sentry non câblé — **décision en attente (DSN ?)** |
| Livraison billets | 🔴 **sans retry** | client payé + Resend down = billet jamais reçu. **T3.10 — vrai risque du jour J** |
| Déployable | ❌ NON | pas de compose prod, pas de Dockerfile front |

---

## ▶️ Sprint S3 — livrable (prochain)

**S2 clos le 2026-07-17**, sauf T2.9 Sentry (décision en attente : DSN ou câblage à vide ?).
Dépendances 36 → 2, CI qui mord, 4 failles fermées (écrasement participant, fuite PII,
Turnstile silencieux, IP d'audit falsifiable), pricing extrait.

| # | Action | Pourquoi |
|---|---|---|
| **Vous** | Ouvrir la PR | la CI ne tourne que sur `main` ou PR→`main` (`gh` absent ici) |
| **Vous** | Clés sandbox GeniusPay | ⚠️ il manque le `whsec_` **sandbox**. Éditeur UTF-8, jamais `Add-Content` |
| **Vous** | Régénérer les clés **live** | transitées en clair dans un canal journalisé le 2026-07-16 |
| **Vous** | Sentry : DSN ou pas ? | dernier item de S2 |
| **T3.10** | **Retry/DLQ livraison** | 🔴 **le vrai risque du jour J** : client payé + Resend down = billet jamais reçu, seule alerte une notif WS qu'un admin doit voir en direct |
| T3.5 | **Backups + test de restauration** | 🔴 aucun aujourd'hui. Un backup jamais restauré n'est pas un backup |
| T3.1 | Dockerfile durci | tourne en **root**, pas de multi-stage, pas de healthcheck, logs bufferisés |
| T3.2/3.3 | Dockerfile front + `compose.prod` | n'existent pas → aucun chemin de déploiement |
| T3.6 | Limiter sur Redis | **avant** tout multi-worker, sinon le rate-limit est par worker donc contournable |
| T3.7 | Backplane WS Redis | idem — le hub est in-memory |
| T3.8 | `/health` réel | ne teste pas la base : ment quand Postgres est tombé |
| T3.9 | e2e en CI | 3 tests Playwright existent, hors CI |

→ Détail : `ROADMAP_REMEDIATION.md` §5. **Après S3 : S4** (légal/RGPD, analytics, charge, Next 16).

---

## 🧠 Où est la vérité — interroger, ne pas explorer

**Économie de tokens : ces 3 couches remplacent le grep/read massif.**

| Besoin | Commande | Coût |
|---|---|---|
| « Pourquoi X ? », « où est Y ? » | `mempalace search "..."` — wing `farahevent_main`, 1885 tiroirs | ~200 tok |
| Findings d'audit détaillés | `mempalace search "audit"` — room `audit`, 11 tiroirs verbatim | ~400 tok |
| « Qui dépend de X ? » | `graphify explain "X"` / `graphify path "A" "B"` | ~200 tok |
| Carte du code | `graphify-out/GRAPH_REPORT.md` — 1839 nœuds / 4351 arêtes (rebâti 2026-07-17) | ~800 tok |
| Le plan | `ROADMAP_REMEDIATION.md` — 5 sprints, gates, DoD | ~3k tok |
| **Pourquoi** d'une décision | `SUIVI_PROJET.md` — historique recalé le 2026-07-17 ; ne fait plus autorité sur l'état | 7k tok |

Après un changement de code : `graphify update .` (0 token LLM, ~30 s).

---

## ⚠️ Pièges anti-hallucination — lire avant de croire quoi que ce soit

> Les pièges **résolus** sont retirés d'ici (ils restent dans les messages de commit et
> dans MemPalace, room `audit`). Ce fichier ne paie que ce qui peut encore mordre.

1. **Aucun document ne fait autorité sur l'état, sauf CE fichier.** `SUIVI_PROJET.md` a été
   recalé (2026-07-17) et rétrogradé en **historique** : il porte le *pourquoi* des décisions,
   plus l'état. Il avait dérivé sans bruit — PayDunya alors que le code avait GeniusPay,
   « validé end-to-end » pour du code non commité. Chaque phrase était vraie quand écrite :
   c'est le mode de défaillance. **Vérifier dans le code, toujours.**
2. **Les commentaires mentent aussi.** `sanitize.ts` affirme « le backend sanitise à l'entrée » →
   **faux**, zéro sanitisation backend, aucune lib dans `requirements.txt`.
3. **Ne jamais croire un compte de tests écrit dans un doc.** « 32 verts » annoncés → la suite
   était en réalité à **20 échecs** au premier lancement réel. Compter soi-même : `bash run_tests.sh`.
4. **Vulns npm : la menace réelle < le chiffre brut.** 2 des 4 high visent l'Image Optimization
   (neutralisée par `images.unoptimized=true`), le « Middleware bypass » vise le Pages Router
   (le projet est en App Router).
5. **Le dépôt est imbriqué à 4 niveaux.** Racine git réelle =
   `farahevent-main (2)/farahevent-main/farahevent-main/farahevent-main`. Correctif propre :
   `git clone` vers un chemin sain (le travail est poussé, c'est sans risque).
6. **Ne PAS retirer les réglages `PAYDUNYA_*` de `config.py`** bien qu'aucun code ne les lise :
   les `.env` les contiennent encore et pydantic refuse les champs extra → **boot cassé**
   (vérifié le 2026-07-17, même mode de défaillance que le `.env` corrompu). Purger les `.env`
   D'ABORD, supprimer les champs ENSUITE.
7. **`.env.local` a `USE_MOCK=1`** et Next **charge `.env.local` en prod**. Sain en `git clone`
   (gitignoré), dangereux en copie de dossier. **Déployer par git, jamais par copie.**
8. **La suite de tests ne peut PAS détecter une migration oubliée.** `conftest.py:34` construit le
   schéma via `Base.metadata.create_all` — donc depuis le **modèle**, jamais via Alembic. Un
   `alembic upgrade head` incomplet reste vert en test **et en CI** pendant que la prod casse.
   C'est exactement ce qui est arrivé à `events.live_links_sent`. Angle mort structurel.
9. **`bash run_tests.sh` ne recrée pas `farahevent_test`** (le `CREATE DATABASE` est en `|| true`).
   Une base de test périmée + `create_all` (qui n'altère jamais une table existante) = échecs
   fantômes. En cas d'échecs massifs après un changement de modèle : `DROP DATABASE farahevent_test`
   puis relancer.

---

## 🧰 Outillage actif

- **claude-mem** — journal auto, worker `:37777`. Rien à faire.
- **MemPalace** — wing `farahevent_main` (1885 tiroirs, rooms `farahevent_backend` / `farahevent_frontend` / `audit` / `e2e` / `testing` / `scripts`).
- **graphify** — `graphify-out/` (gitignoré, régénérable).
- **Skills** — `iron-system` (méta : EXTRACT→SYNTHESIZE→BUILD→AUDIT) + 14 skills **superpowers**
  (TDD, systematic-debugging, writing-plans, verification-before-completion…).
- ⚠️ Le hook SessionStart de superpowers **n'est pas installé** (coût tokens). Pour l'activer :
  `/plugin install superpowers@claude-plugins-official` dans un terminal interactif.

---

## 📋 Journal (3 dernières sessions ; l'historique long est dans `SUIVI_PROJET.md` §9 + `git log`)

| Date | Session | Fait | État après |
|---|---|---|---|
| 2026-07-17 | 4c | **S2 ✅ sauf Sentry.** Deps **36 → 2 advisories** (jose 3.4, FastAPI 0.111→0.139 / starlette 1.3.1, multipart 0.0.31, pillow 12.3) — les 3 atteignables sans auth ont disparu. CI : `build` (absent !) + couverture 60 % + `pip-audit` bloquants. **4 failles fermées** : vol de billet par écrasement de participant, fuite PII `/resend`, Turnstile silencieux, IP d'audit falsifiable. Pricing extrait (neutralité prouvée sur 399 602 prix). **153/153.** | S2 clos |
| 2026-07-17 | 4b | **S1 ✅.** `payment.refunded` ignoré (billet valide après remboursement) → `refund_service` partagé. Gate Live : 3 défauts, 0 test → 10 tests. Upload : purge des orphelins + rate limit 20/h (NAT mobile CI). `/admin/database` : audit + `SUPER_ADMIN` + gardes ventes + intégrité FK → 13 tests. Doc recalée (`SUIVI_PROJET.md` devient un historique). **109/109.** ⚠️ J'ai reproduit le bug P1 en retirant `PAYDUNYA_*` de `config.py` — boot cassé, annulé. | **S1 clos** |
| 2026-07-17 | 4 | **S1 T1.1 ✅ — GeniusPay câblé, 74/74 verts.** `_select_provider` (GeniusPay si clés, sinon stub + WARNING), `verify_webhook_signature` sur l'ABC en **fail-closed**, route `POST /webhooks/geniuspay` (signature HMAC corps brut + anti-rejeu 5 min + idempotence + livraison via BackgroundTasks = après commit). **4 écarts au contrat corrigés** en confrontant le code à la doc : `mobile_money` inexistant chez GeniusPay → `pawapay` ; `card` valide (remap inutile) ; objet `customer` absent ; min 200 XOF. **Frais réels** désormais stockés. Défaut de paiement inversé. **+41 tests**, mutation-testés. | S1 ~60 % (T1.1 clos) |

---

## 🔄 Protocole de mise à jour de ce fichier

**À chaque fin de session, en 2 minutes :**
0. **`graphify update .`** (~30 s, 0 token LLM). Le graphe **ne se met pas à jour tout seul** :
   au 2026-07-17 il avait 10 commits de retard et décrivait encore `GeniusPayProvider` comme du
   code mort — il était devenu une source d'hallucination au lieu d'un garde-fou.
1. Ajouter **1 ligne** au Journal (date, ce qui a été fait, état après).
2. Mettre à jour le tableau **État vérifié** — uniquement des faits **prouvés par une commande**,
   jamais « je pense que ça marche ».
3. Si D1 est tranchée : l'écrire dans **Décision en attente** et dans `SUIVI_PROJET.md`.
4. Mettre à jour la ligne **Dernière MAJ** en tête.
5. Ajouter tout nouveau piège découvert dans **Anti-hallucination**.

**Règle d'or : ce fichier ne contient que du vérifié.** Une supposition ici deviendra
l'hallucination de la prochaine session — c'est exactement ce qui est arrivé à `SUIVI_PROJET.md`.
S'il dépasse ~150 lignes, il a échoué : élaguer, déplacer le détail vers `ROADMAP_REMEDIATION.md`
ou MemPalace.
