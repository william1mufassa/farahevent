# FarahEvent — Backend API

Backend FastAPI pour la plateforme de billetterie hybride FarahEvent.

## Stack

- **FastAPI** + Python 3.11
- **PostgreSQL 16** (AsyncPG en runtime, psycopg2 pour Alembic)
- **SQLAlchemy 2.0** async
- **Alembic** — migrations
- **Redis 7** — cache, sessions live (Sprint 5)
- **PayDunya** — paiement (Sprint 5)
- **OpenWA** — distribution WhatsApp
- **Brevo** — email transactionnel (Sprint 6/collabo)

## Structure

```
app/
├── api/v1/
│   ├── endpoints/
│   │   ├── auth.py       # Auth admin (login + refresh)
│   │   ├── events.py     # (stub) list/detail public — Sprint 2
│   │   ├── orders.py     # (stub) achat anonyme + manual payment — Sprint 2
│   │   ├── payments.py   # (stub) status polling — Sprint 5
│   │   ├── tickets.py    # (stub) scan + resend — Sprints 2/3
│   │   └── webhooks.py   # (stub) PayDunya — Sprint 5
│   └── router.py
├── core/
│   ├── config.py         # settings pydantic
│   ├── database.py       # engine async
│   └── security.py       # JWT + get_current_admin + require_roles
├── models/               # 14 tables SQLAlchemy + enums
├── services/
│   ├── qr_service.py     # (legacy) — refactor JWT au Sprint 3
│   └── whatsapp_service.py  # OpenWA
└── main.py
alembic/                  # migrations
scripts/                  # CLI utilities
```

## Setup rapide

Voir `RAPPORT_DEV.md` pour les commandes complètes.

```bash
python -m venv .venv && source .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env    # ajuster DATABASE_URL et SECRET_KEY
alembic upgrade head
python -m scripts.create_super_admin admin@example.com "P@ss1234!" John Doe
uvicorn app.main:app --reload
```

## Schéma BDD (14 tables)

| Table | Rôle |
|---|---|
| `admins` | 4 rôles : super_admin, manager, agent, comptable |
| `participants` | Acheteurs anonymes |
| `events` | Événements + status draft/open/live/closed |
| `formulas` | Formules tarifaires (channel presentiel/online/both) |
| `orders` | 7 statuts (PENDING → PAID / MANUAL_VALIDATED / ...) |
| `tickets` | Billets QR (JWT signé Sprint 3) et/ou live_link |
| `manual_payments` | Preuves Western Union / RIA / MoneyGram |
| `payment_config` | Instructions paiement manuel par événement |
| `event_content` | CMS clé/valeur (bannière, FAQ, ...) |
| `whatsapp_groups` | Basculement auto à saturation |
| `chatbot_faqs` | FAQ chatbot |
| `email_automations` | Config n8n (triggers relatifs) |
| `scan_logs` | Log de chaque scan |
| `audit_logs` | Actions admin |

## Endpoints actifs

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/health` | ping |
| POST | `/api/v1/admin/auth/login` | login admin |
| POST | `/api/v1/admin/auth/refresh` | renouveler l'access token |

Le reste renvoie **501 TODO** — voir `RAPPORT_DEV.md`.
