import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.rate_limit import limiter
from app.api.v1.router import api_router
from app.core.database import engine, AsyncSessionLocal
from app.services.whatsapp_service import whatsapp_service
from app.services.turnstile_service import turnstile_service
from app.services.revalidate_service import revalidate_service
from app.services.reconciliation_service import reconcile_pending_orders

# Import des modèles pour qu'Alembic les détecte via Base.metadata.
import app.models  # noqa: F401

logger = logging.getLogger(__name__)

# Intervalle du job de réconciliation des paiements (CDC §2.2.2).
RECONCILE_INTERVAL_SECONDS = 300


async def _reconciliation_loop() -> None:
    """Boucle de fond : réconcilie les paiements PENDING orphelins toutes les 5 min.

    NB multi-worker : en prod avec plusieurs workers, cette boucle tourne dans
    chacun. La réconciliation est idempotente (verrou formule + billets idempotents),
    donc sûre, mais pour éviter le travail redondant, la déplacer vers un scheduler
    unique (cron/n8n) ou poser un verrou Redis est recommandé.
    """
    while True:
        await asyncio.sleep(RECONCILE_INTERVAL_SECONDS)
        try:
            async with AsyncSessionLocal() as db:
                counts = await reconcile_pending_orders(db)
                await db.commit()
            if counts["checked"]:
                logger.info("Réconciliation paiements: %s", counts)
        except Exception:
            logger.exception("Boucle de réconciliation: erreur, on poursuit")


@asynccontextmanager
async def lifespan(app: FastAPI):
    reconciliation_task = asyncio.create_task(_reconciliation_loop())
    yield
    reconciliation_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await reconciliation_task
    await whatsapp_service.aclose()
    await turnstile_service.aclose()
    await revalidate_service.aclose()
    await engine.dispose()


app = FastAPI(
    title="FarahEvent API",
    description="Plateforme de billetterie hybride — Côte d'Ivoire",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiting (audit §C.4) — protège /login, /orders, /tickets/resend.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

# NB (audit §C.2) : les reçus de paiement (données financières) NE SONT PLUS
# servis en statique public. Ils passent par la route admin authentifiée
# GET /api/v1/admin/manual-payments/{id}/receipt. En prod, nginx ne doit PAS
# exposer le dossier uploads/receipts/.


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": "FarahEvent API", "version": "1.0.0"}
