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
from app.core.security import decode_ws_ticket, decode_live_token
from app.services.notification_hub import notification_hub
import asyncio

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


class LiveHub:
    def __init__(self):
        # event_id -> set(websockets)
        self.active_connections: dict[str, set[WebSocket]] = {}

    def connect(self, event_id: str, websocket: WebSocket):
        if event_id not in self.active_connections:
            self.active_connections[event_id] = set()
        self.active_connections[event_id].add(websocket)

    def disconnect(self, event_id: str, websocket: WebSocket):
        if event_id in self.active_connections:
            self.active_connections[event_id].discard(websocket)
            if not self.active_connections[event_id]:
                del self.active_connections[event_id]

    def get_viewer_count(self, event_id: str) -> int:
        return len(self.active_connections.get(event_id, set()))

    async def broadcast_viewer_count(self, event_id: str):
        count = self.get_viewer_count(event_id)
        message = {"type": "viewers", "count": count}
        connections = list(self.active_connections.get(event_id, set()))
        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(event_id, ws)

live_hub = LiveHub()


@router.websocket("/live/{token}")
async def live_viewer_ws(websocket: WebSocket, token: str):
    await websocket.accept()
    
    payload = decode_live_token(token)
    if not payload or not payload.get("event_id"):
        await websocket.close(code=_WS_POLICY_VIOLATION)
        return

    event_id = payload["event_id"]
    live_hub.connect(event_id, websocket)
    
    # Send initial count
    await live_hub.broadcast_viewer_count(event_id)

    try:
        while True:
            # We just keep the connection open, no need to receive data
            # Or handle ping/pong
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.debug(f"Live WS error: {e}")
    finally:
        live_hub.disconnect(event_id, websocket)
        await live_hub.broadcast_viewer_count(event_id)
