# ÉTAT — FarahEvent

> **Lire CE fichier en premier, et lui seul.** 126 lignes ≈ **1 700 tokens** — contre ~6 800 pour
> `SUIVI_PROJET.md` (périmé) et le coût bien plus lourd d'une ré-exploration du code.
>
> **Dernière MAJ : 2026-07-16 · Session 2 · Sprint S0 non démarré**

---

## ⚡ Reprise en 30 secondes

FarahEvent = billetterie hybride (présentiel + live) pour la Côte d'Ivoire. FastAPI + Next.js 14,
~26k LOC, monorepo, **pré-production, 0 utilisateur réel**, dev solo.

**Le code est bon. La chaîne de livraison est le problème.** Un audit complet (2026-07-16) a noté
5,5/10 et trouvé 5 bloquants vérifiés *par exécution*, pas par lecture. Deux d'entre eux dominent :
**le backend ne démarre pas** et **79 fichiers ne sont pas commités**.

**➡️ Prochaine action : Sprint S0 (2 h)** — voir `ROADMAP_REMEDIATION.md` §2.

---

## 🚦 État vérifié (2026-07-16)

| Fait | État | Preuve |
|---|---|---|
| Backend démarre | ❌ **NON** | `.env` encodage mixte UTF-8+UTF-16 → `ValidationError` pydantic |
| Travail poussé | ❌ **NON** | 79 fichiers non commités depuis `e914b94` (2026-07-13) |
| Encaissement digital | ❌ **MORT** | provider actif = `StubPaymentProvider()`, GeniusPay = code mort |
| Encaissement manuel | ✅ OK | testé (`test_manual_payments_http.py`) — **seule voie qui marche** |
| Accès Live | ❌ **CASSÉ** | `live.py:69` exclut `MANUAL_VALIDATED` = tous les clients réels |
| Destruction tracée | ❌ NON | `/admin/database` sans `audit_service`, MANAGER peut hard-delete |
| Vulns sans auth | 🔴 3 paquets | jose, multipart, starlette (36 advisories py, 4 high npm) |
| Backups | ❌ AUCUN | rien dans le dépôt |
| CI | 🟡 verte mais faible | pas de `build`, pas d'audit, pas de couverture |
| Déployable | ❌ NON | pas de compose prod, pas de Dockerfile front |

---

## ⛔ Décision en attente — D1 (bloque le Sprint S1)

> **Les credentials sandbox GeniusPay sont-ils disponibles sous 7 jours ?**

- **OUI** → câbler (déclarer 2 clés dans `config.py`, wirer le provider, webhook HMAC) — 2 j
- **NON** → retirer le provider, assumer « 1er événement = manuel uniquement » — 2 h

**Ne pas trancher = pire choix** (état actuel : code mort dans le chemin de paiement + zéro encaissement digital).
Recommandation en cas de doute : **MANUEL-ONLY** — c'est le vrai différenciateur diaspora, il marche, il est testé.

**Statut : ⏳ non tranchée.**

---

## 🧠 Où est la vérité — interroger, ne pas explorer

**Économie de tokens : ces 3 couches remplacent le grep/read massif.**

| Besoin | Commande | Coût |
|---|---|---|
| « Pourquoi X ? », « où est Y ? » | `mempalace search "..."` — wing `farahevent_main`, 1851 tiroirs | ~200 tok |
| Findings d'audit détaillés | `mempalace search "audit"` — room `audit`, 2 tiroirs verbatim | ~400 tok |
| « Qui dépend de X ? » | `graphify explain "X"` / `graphify path "A" "B"` | ~200 tok |
| Carte du code | `graphify-out/GRAPH_REPORT.md` — 1654 nœuds / 4019 arêtes | ~800 tok |
| Le plan | `ROADMAP_REMEDIATION.md` — 5 sprints, gates, DoD | ~3k tok |
| Historique/contexte | `SUIVI_PROJET.md` — ⚠️ **périmé, voir pièges** | 7k tok |

Après un changement de code : `graphify update .` (0 token LLM, ~30 s).

---

## ⚠️ Pièges anti-hallucination — lire avant de croire quoi que ce soit

1. **`SUIVI_PROJET.md` a dérivé du code.** Il cite **PayDunya** (le code a **GeniusPay**), ignore
   Live / `email_service` / `admin/database.py`, et affirme « Chantier 3 terminé & validé
   end-to-end » pour du code **non commité** sur une app qui **ne démarre pas**. Vérifier dans le code.
2. **Les commentaires mentent aussi.** `sanitize.ts` affirme « le backend sanitise à l'entrée » →
   **faux**, zéro sanitisation backend, aucune lib dans `requirements.txt`.
3. **« 32 tests verts »** décrit un état non commité. Compter soi-même : `bash run_tests.sh`.
4. **Ne PAS conclure à un bug d'enum** dans `live.py` : `OrderStatus` hérite de `str`, la comparaison
   `str`/`Enum` est **correcte**. Le bug est l'oubli de `MANUAL_VALIDATED`.
5. **Vulns npm : la menace réelle < le chiffre brut.** 2 des 4 high visent l'Image Optimization
   (neutralisée par `images.unoptimized=true`), le « Middleware bypass » vise le Pages Router
   (le projet est en App Router).
6. **Le dépôt est imbriqué à 4 niveaux.** Racine git réelle =
   `farahevent-main (2)/farahevent-main/farahevent-main/farahevent-main`. Correctif propre : après S0,
   `git clone` vers un chemin sain.
7. **`.env.local` a `USE_MOCK=1`** et Next **charge `.env.local` en prod**. Sain en `git clone`
   (gitignoré), dangereux en copie de dossier. **Déployer par git, jamais par copie.**

---

## 🧰 Outillage actif

- **claude-mem** — journal auto, worker `:37777`. Rien à faire.
- **MemPalace** — wing `farahevent_main` (1851 tiroirs, rooms `farahevent_backend` / `farahevent_frontend` / `audit` / `e2e` / `testing` / `scripts`).
- **graphify** — `graphify-out/` (gitignoré, régénérable).
- **Skills** — `iron-system` (méta : EXTRACT→SYNTHESIZE→BUILD→AUDIT) + 14 skills **superpowers**
  (TDD, systematic-debugging, writing-plans, verification-before-completion…).
- ⚠️ Le hook SessionStart de superpowers **n'est pas installé** (coût tokens). Pour l'activer :
  `/plugin install superpowers@claude-plugins-official` dans un terminal interactif.

---

## 📋 Journal (append-only — 1 ligne par session, la plus récente en haut)

| Date | Session | Fait | État après |
|---|---|---|---|
| 2026-07-16 | 2 | Memory system activé (MemPalace wing + graphify). `iron-system` + superpowers installés. Nettoyage : nginx **rapaté** dans `infra/nginx/`, 6 fichiers périmés archivés → `Desktop/_farahevent_archive_2026-07-16/`, caches purgés. `ROADMAP_REMEDIATION.md` + `ETAT.md` créés. | S0 prêt à démarrer |
| 2026-07-16 | 1 | Audit complet 11 dimensions → **5,5/10**, 5 bloquants vérifiés par exécution. | Audit livré |

---

## 🔄 Protocole de mise à jour de ce fichier

**À chaque fin de session, en 2 minutes :**
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
