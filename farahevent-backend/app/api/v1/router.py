from fastapi import APIRouter

from app.api.v1.endpoints import auth, events, tickets, orders, payments, webhooks
from app.api.v1.endpoints.admin import (
    admins,
    audit_logs,
    chatbot_faqs,
    cms,
    dashboard,
    email_automations,
    event_draft,
    events as admin_events,
    finance,
    formulas,
    manual_payments,
    participants,
    payment_config,
    two_factor,
    whatsapp_groups,
)

api_router = APIRouter()

# --- Public / anonyme
api_router.include_router(events.router, prefix="/events", tags=["Événements (public)"])
api_router.include_router(orders.router, prefix="/orders", tags=["Commandes (public)"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["Billets"])
api_router.include_router(payments.router, prefix="/payments", tags=["Paiements"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])

# --- Admin — auth
api_router.include_router(auth.router, prefix="/admin/auth", tags=["Admin · Auth"])
api_router.include_router(two_factor.router, prefix="/admin/auth/2fa", tags=["Admin · 2FA"])

# --- Admin — Dashboard (stats + notifications)
api_router.include_router(dashboard.router, prefix="/admin", tags=["Admin · Dashboard"])
api_router.include_router(participants.router, prefix="/admin", tags=["Admin · Participants"])
api_router.include_router(finance.router, prefix="/admin", tags=["Admin · Finances"])

# --- Admin — CRUD ressources
api_router.include_router(admins.router, prefix="/admin/admins", tags=["Admin · Collaborateurs"])
api_router.include_router(admin_events.router, prefix="/admin/events", tags=["Admin · Événements"])
api_router.include_router(formulas.router, prefix="/admin", tags=["Admin · Formules"])
api_router.include_router(cms.router, prefix="/admin", tags=["Admin · CMS"])
api_router.include_router(payment_config.router, prefix="/admin", tags=["Admin · Config paiement"])
api_router.include_router(whatsapp_groups.router, prefix="/admin", tags=["Admin · WhatsApp Groups"])
api_router.include_router(chatbot_faqs.router, prefix="/admin", tags=["Admin · Chatbot FAQ"])
api_router.include_router(email_automations.router, prefix="/admin", tags=["Admin · Automations"])
api_router.include_router(
    manual_payments.router, prefix="/admin/manual-payments", tags=["Admin · Paiements manuels"]
)
api_router.include_router(
    audit_logs.router, prefix="/admin/audit-logs", tags=["Admin · Audit trail"]
)
# ⚠ APRÈS admin_events : la route générique PATCH /events/{id}/{section} ne doit pas
# court-circuiter /events/{id}/status ni /events/{id} (garde de transition de statut).
api_router.include_router(event_draft.router, prefix="/admin", tags=["Admin · CMS brouillon"])
