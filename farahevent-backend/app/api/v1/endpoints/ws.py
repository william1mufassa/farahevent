"""WebSocket admin — flux temps réel des notifications.

Auth par TICKET court-terme : le JWT de session vit en cookie httpOnly, non
transmis au handshake WS (cross-origin). Le front obtient un ticket via le BFF
authentifié (GET /admin/ws-ticket) puis se connecte avec `?ticket=<jwt>`.

Le ticket est la garde anti-CSWSH principale : inobtenable cross-site (cookie
httpOnly + BFF qui refuse les origines croisées). La vérification d'Origin
ci-dessous n'est qu'une défense en profondeur.
"""
import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.core.security import decode_ws_ticket
from app.services.notification_hub import notification_hub

logger = logging.getLogger(__name__)

router = APIRouter()

_WS_POLICY_VIOLATION = 1008  # RFC 6455 : fermeture pour violation de politique.


@router.websocket("/admin/notifications")
async def admin_notifications_ws(websocket: WebSocket, ticket: str = Query(default="")):
    # Défense en profondeur : borne l'Origin (un navigateur l'envoie toujours ;
    # absent = client non-navigateur, le ticket reste alors la seule garde).
    origin = websocket.headers.get("origin")
    if origin and origin not in settings.ALLOWED_ORIGINS:
        await websocket.close(code=_WS_POLICY_VIOLATION)
        return

    if decode_ws_ticket(ticket) is None:
        # Ticket absent / invalide / expiré / mauvais type → refus du handshake.
        # Le front rouvre avec un ticket frais (backoff de useWebSocket).
        await websocket.close(code=_WS_POLICY_VIOLATION)
        return

    await websocket.accept()
    notification_hub.register(websocket)
    try:
        # Le serveur ne fait que pousser ; on lit en boucle uniquement pour
        # détecter la déconnexion (et absorber d'éventuels pings du client).
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.debug("WS admin notifications : lecture interrompue", exc_info=True)
    finally:
        notification_hub.unregister(websocket)
