# ÉTAT — FarahEvent

> **Lire CE fichier en premier, et lui seul.** 150 lignes ≈ **2 600 tokens** — contre ~6 800 pour
> `SUIVI_PROJET.md`, et bien plus pour une ré-exploration du code.
> **Dernière MAJ : 2026-07-17 · S0 ✅ S1 ✅ S2 ✅ — prochain : S3 (livrable)**

---

## ⚡ Reprise en 30 secondes

FarahEvent = billetterie hybride (présentiel + live) pour la Côte d'Ivoire. FastAPI + Next.js 14,
~26k LOC, monorepo, **pré-production, 0 utilisateur réel**, dev solo.

**Le code est bon. La chaîne de livraison était le problème.** Audit du 2026-07-16 : 5,5/10,
5 bloquants vérifiés *par exécution*. **S0 clos** (app démarre, travail poussé, 74/74 verts) ;
**S1 clos** (GeniusPay câblé, Live réparé, destruction tracée) ; **S2 clos** (36 → 2 advisories,
CI qui mord, 4 failles fermées ; Sentry différé). **153 tests.** Tout est sur la branche
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
| Observabilité | ❌ AUCUNE | Sentry **différé** (décidé 2026-07-17). Rien ne dira ce qui casse en prod — à reprendre avant le 1er événement |
| Livraison billets | 🔴 **sans retry** | client payé + Resend down = billet jamais reçu. **T3.10 — vrai risque du jour J** |
| Déployable | ❌ NON | pas de compose prod, pas de Dockerfile front |

---

## ▶️ Sprint S3 — livrable (prochain)

**S2 clos le 2026-07-17.** T2.9 Sentry **différé** — assumé, mais rien ne dira ce qui casse en prod.
Dépendances 36 → 2, CI qui mord, 4 failles fermées (écrasement participant, fuite PII,
Turnstile silencieux, IP d'audit falsifiable), pricing extrait.

| # | Action | Pourquoi |
|---|---|---|
| **Vous** | Ouvrir la PR | la CI ne tourne que sur `main` ou PR→`main` (`gh` absent ici) |
| **Vous** | Clés sandbox GeniusPay | ⚠️ il manque le `whsec_` **sandbox**. Éditeur UTF-8, jamais `Add-Content` |
| **Vous** | Régénérer les clés **live** | transitées en clair dans un canal journalisé le 2026-07-16 |
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

1. **Seul CE fichier fait autorité sur l'état.** `SUIVI_PROJET.md` = historique/décisions.
   Il avait dérivé sans bruit (PayDunya vs GeniusPay, « validé » pour du code non commité) :
   chaque phrase était vraie quand écrite — c'est le mode de défaillance. **Ce fichier-ci a
   dérivé 3 fois en une session.** Vérifier dans le code, toujours.
2. **Les commentaires mentent aussi.** `sanitize.ts` affirme « le backend sanitise à l'entrée »
   → **faux** : zéro sanitisation backend, aucune lib dans `requirements.txt`.
3. **Ne jamais croire un compte de tests écrit dans un doc.** « 32 verts » annoncés → la suite
   était à **20 échecs** au premier lancement réel. Compter soi-même : `bash run_tests.sh`.
4. **La suite ne peut PAS détecter une migration oubliée.** `conftest.py:34` construit le schéma
   via `Base.metadata.create_all` — depuis le **modèle**, jamais via Alembic. Un
   `alembic upgrade head` incomplet reste vert en test **et en CI** pendant que la prod casse
   (c'est arrivé à `events.live_links_sent`). **Angle mort structurel, non résolu.**
5. **`run_tests.sh` ne recrée pas `farahevent_test`** (`CREATE DATABASE ... || true`). Base
   périmée + `create_all` (qui n'altère jamais une table existante) = échecs fantômes. Après un
   changement de modèle : `DROP DATABASE farahevent_test`, puis relancer.
6. **Ne PAS retirer les réglages `PAYDUNYA_*` de `config.py`** bien qu'aucun code ne les lise :
   les `.env` les contiennent encore et pydantic refuse les champs extra → **boot cassé**
   (vérifié). Purger les `.env` D'ABORD, supprimer les champs ENSUITE.
7. **Vulns npm : la menace réelle < le chiffre brut.** 2 des 4 high visent l'Image Optimization
   (neutralisée par `images.unoptimized=true`), le « Middleware bypass » vise le Pages Router
   (le projet est en App Router). Aucun correctif en 14.x → Next 16 en S4.
8. **Dépôt imbriqué à 4 niveaux.** Racine git réelle = `…/farahevent-main` ×4. Correctif :
   `git clone` vers un chemin sain — le travail est poussé, c'est sans risque.

---

## 🧰 Outillage actif

- **claude-mem** (auto, `:37777`) · **MemPalace** (wing `farahevent_main`, 1885 tiroirs,
  room `audit`) · **graphify** (`graphify-out/`, gitignoré).
- **Skills** : `iron-system` + 14 **superpowers** (TDD, systematic-debugging, writing-plans,
  verification-before-completion…). Le hook SessionStart de superpowers **n'est pas installé**
  (coût tokens) → `/plugin install superpowers@claude-plugins-official` en terminal interactif.

---

## 📋 Journal (3 dernières sessions ; le détail est dans `git log` et `SUIVI_PROJET.md` §9)

| Date | Fait | État après |
|---|---|---|
| 2026-07-17 | **S2** — deps 36 → 2 advisories (FastAPI 0.111→0.139, jose 3.4, multipart, pillow) ; CI : `build` + couverture 60 % + `pip-audit` bloquants ; 4 failles fermées (écrasement participant, fuite PII, Turnstile silencieux, IP d'audit falsifiable) ; pricing extrait. **153/153.** ⏸️ Sentry différé. | **S2 clos** |
| 2026-07-17 | **S1** — GeniusPay câblé + webhook signé (4 écarts au contrat corrigés) ; `payment.refunded` traité ; gate Live réparé ; upload borné ; `/admin/database` sécurisé ; doc recalée. **109/109.** | **S1 clos** |
| 2026-07-16 | **S0** — `.env` réparé, 97 fichiers poussés, 3 bugs trouvés en exécutant. Audit 11 dimensions → 5,5/10. **74/74.** | **S0 clos** |

---

## 🔄 Protocole de fin de session (2 min)

1. **`graphify update .`** — le graphe **ne se met pas à jour seul** ; périmé, il devient une
   source d'hallucination (au 2026-07-17 il décrivait encore `GeniusPayProvider` comme mort).
2. **1 ligne** au Journal ; élaguer au-delà de 3.
3. Recaler **État vérifié** et **Dernière MAJ** — uniquement des faits **prouvés par une
   commande**, jamais « je pense que ça marche ».
4. Ajouter tout nouveau piège dans **Anti-hallucination** ; **retirer ceux qui sont résolus**.

**Règle d'or : que du vérifié.** Une supposition ici devient l'hallucination de la prochaine
session. **> 150 lignes = échec** : élaguer vers `ROADMAP_REMEDIATION.md`, MemPalace ou `git log`.
Ce fichier a déjà dérivé 3 fois en une session — il ne reste juste que si on le remet juste.
