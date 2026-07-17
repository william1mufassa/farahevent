# ÉTAT — FarahEvent

> **Lire CE fichier en premier, et lui seul.** ~150 lignes ≈ **1 900 tokens** — contre ~6 800 pour
> `SUIVI_PROJET.md` (périmé) et le coût bien plus lourd d'une ré-exploration du code.
>
> **Dernière MAJ : 2026-07-17 · Session 4 · S0 ✅ · S1 ✅ — prochain : S2 (durcissement)**

---

## ⚡ Reprise en 30 secondes

FarahEvent = billetterie hybride (présentiel + live) pour la Côte d'Ivoire. FastAPI + Next.js 14,
~26k LOC, monorepo, **pré-production, 0 utilisateur réel**, dev solo.

**Le code est bon. La chaîne de livraison était le problème.** Audit du 2026-07-16 : 5,5/10,
5 bloquants vérifiés *par exécution*. **S0 clos** (app démarre, travail poussé, 74/74 verts) ;
**S1 clos** (GeniusPay câblé, Live réparé, destruction tracée, 109 tests). Tout est sur la branche
`chantier/live-delivery-admin`, jamais mergé sur `main`.

**➡️ Prochaine action : S2 (durcissement)** — dépendances jose/multipart/starlette, écrasement de
participant, fuite PII `/tickets/resend`, CI qui mord, Sentry. Voir `ROADMAP_REMEDIATION.md` §4.

---

## 🚦 État vérifié (2026-07-17)

| Fait | État | Preuve |
|---|---|---|
| Config charge | ✅ **OUI** | `.env` réécrit en UTF-8 (53 octets nuls retirés) |
| Backend démarre | ✅ **OUI** | `docker compose up` → **`/health` 200**, 0 erreur dans les logs |
| Schéma DB complet | ✅ **OUI** | migration `0004_live_links_sent` ajoutée (manquait) + réversibilité testée |
| Travail poussé | ✅ **OUI** | branche `chantier/live-delivery-admin`, 18 commits, sur `origin` — **jamais mergée sur `main`** |
| Tests | ✅ **109/109** | vérifié le 2026-07-17. 33 → 109. Tous les nouveaux sont **mutation-testés** (signature acceptant tout → 3 échecs ; idempotence retirée → 1 ; anti-rejeu retiré → 2) |
| CI | ⏳ **non déclenchée** | ne tourne que sur `main` ou PR→`main`. **PR à ouvrir à la main** (`gh` absent) |
| Encaissement digital | 🟡 **câblé, clés absentes** | code + webhook + 41 tests ✅. Clés absentes du `.env` → **le boot logge « Paiement digital : STUB actif »** (vérifié). Dès que les clés sont posées, le log passe à « GeniusPay (mode=test) » — c'est le témoin à regarder |
| Encaissement manuel | ✅ OK | testé (`test_manual_payments_http.py`) — **seule voie qui marche** |
| Accès Live | ✅ **RÉPARÉ** | `MANUAL_VALIDATED` accepté, droit basé sur `formula.channel`, joker ILIKE fermé, rate limit — 10 tests |
| Destruction tracée | ✅ **OUI** | audit sur les 3 routes, `SUPER_ADMIN` seul, 409 si ventes réelles — **les 13 modules admin sont tracés** |
| Vulns sans auth | 🔴 3 paquets | jose, multipart, starlette (36 advisories py, 4 high npm) |
| Backups | ❌ AUCUN | rien dans le dépôt |
| Déployable | ❌ NON | pas de compose prod, pas de Dockerfile front |

---

## ▶️ Sprint S2 — durcissement (prochain)

**S1 clos le 2026-07-17** : GeniusPay câblé + webhook signé, `payment.refunded` traité,
gate Live réparé, upload borné, `/admin/database` sécurisé, doc recalée. 109 tests.

| # | Action | Détail |
|---|---|---|
| **Vous** | Poser les clés sandbox dans `.env` | ⚠️ éditeur UTF-8, jamais `Add-Content`. ⚠️ le `whsec_` **sandbox** diffère de celui de prod. Témoin : le boot logge le provider actif |
| **Vous** | Régénérer les clés **live** | elles ont transité en clair dans un canal journalisé le 2026-07-16 |
| **Vous** | Ouvrir la PR | la CI ne tourne que sur `main` ou PR→`main` (`gh` absent ici) |
| T2.1 | `python-jose` → 3.4.0 | confusion d'algo + DoS ; signe l'auth admin ET les billets QR |
| T2.2 | `python-multipart` + `starlette` | DoS multipart **atteignable sans auth** ; implique de bumper FastAPI |
| T2.3 | Écrasement de participant | `orders.py` `_upsert_participant` écrase `whatsapp` depuis une entrée anonyme |
| T2.4 | Fuite PII `/tickets/resend` | renvoie le WhatsApp en clair + même joker ILIKE (déjà fermé sur `/live/access`) |
| T2.5 | Turnstile dans le boot-guard | no-op silencieux si la clé est vide, même en prod |
| T2.6 | XFF dans le proxy BFF | le backend logge l'IP du serveur Next, pas celle de l'admin |
| T2.8 | CI qui mord | `npm run build` (absent !), `pip-audit`, `npm audit`, couverture |
| T2.9 | Sentry | zéro observabilité aujourd'hui |

→ Détail : `ROADMAP_REMEDIATION.md` §4.

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

## 📋 Journal (append-only — 1 ligne par session, la plus récente en haut)

| Date | Session | Fait | État après |
|---|---|---|---|
| 2026-07-17 | 4b | **S1 ✅.** `payment.refunded` ignoré (billet valide après remboursement) → `refund_service` partagé. Gate Live : 3 défauts, 0 test → 10 tests. Upload : purge des orphelins + rate limit 20/h (NAT mobile CI). `/admin/database` : audit + `SUPER_ADMIN` + gardes ventes + intégrité FK → 13 tests. Doc recalée (`SUIVI_PROJET.md` devient un historique). **109/109.** ⚠️ J'ai reproduit le bug P1 en retirant `PAYDUNYA_*` de `config.py` — boot cassé, annulé. | **S1 clos** |
| 2026-07-17 | 4 | **S1 T1.1 ✅ — GeniusPay câblé, 74/74 verts.** `_select_provider` (GeniusPay si clés, sinon stub + WARNING), `verify_webhook_signature` sur l'ABC en **fail-closed**, route `POST /webhooks/geniuspay` (signature HMAC corps brut + anti-rejeu 5 min + idempotence + livraison via BackgroundTasks = après commit). **4 écarts au contrat corrigés** en confrontant le code à la doc : `mobile_money` inexistant chez GeniusPay → `pawapay` ; `card` valide (remap inutile) ; objet `customer` absent ; min 200 XOF. **Frais réels** désormais stockés. Défaut de paiement inversé. **+41 tests**, mutation-testés. | S1 ~60 % (T1.1 clos) |
| 2026-07-16 | 3 | **S0 ✅.** `.env` réparé → config charge. 97 fichiers en 5 commits, poussés → **travail sauvé** (0 secret, vérifié). **D1 tranchée : GeniusPay (GO).** Stack montée : `/health` 200. **3 bugs trouvés en exécutant** : migration `live_links_sent` manquante (live_notifier plantait en boucle) ; handler d'erreur de la réconciliation qui plante lui-même (`MissingGreenlet` sur instance expirée) ; tâche de livraison collectable par le GC. Tests : **20 échecs → 33/33 verts** (2 passages). Reste : ouvrir la PR (`gh` absent). | **S0 terminé** |
| 2026-07-16 | 2 | Memory system activé (MemPalace wing + graphify). `iron-system` + superpowers installés. Nettoyage : nginx **rapaté** dans `infra/nginx/`, 6 fichiers périmés archivés → `Desktop/_farahevent_archive_2026-07-16/`, caches purgés. `ROADMAP_REMEDIATION.md` + `ETAT.md` créés. | S0 prêt à démarrer |
| 2026-07-16 | 1 | Audit complet 11 dimensions → **5,5/10**, 5 bloquants vérifiés par exécution. | Audit livré |

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
