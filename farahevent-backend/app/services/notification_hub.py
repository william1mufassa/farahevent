"""Hub de notifications admin temps réel (WebSocket).

Push in-memory des *nouvelles* notifications admin vers les sockets connectées.
Le seed initial reste HTTP (GET /admin/notifications) ; ce hub ne diffuse que
l'incrément (ex. un paiement manuel soumis) — le store front déduplique par id.

⚠ Portée : un seul process. En prod multi-worker (gunicorn), un broadcast
n'atteint que les sockets du worker courant → il faudra un backplane Redis
pub/sub (dette §7). En dev (uvicorn --reload, 1 worker) : suffisant.
"""
import logging
from typing import Any

from starlette.websockets import WebSocket

logger = logging.getLogger(__name__)


class NotificationHub:
    """Registre in-memory des connexions WS admin + broadcast."""

    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    def register(self, ws: WebSocket) -> None:
        self._connections.add(ws)

    def unregister(self, ws: WebSocket) -> None:
        self._connections.discard(ws)

    @property
    def count(self) -> int:
        return len(self._connections)

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Diffuse `message` (JSON) à toutes les sockets. Fire-and-forget : une
        socket morte est retirée du registre, jamais propagée à l'appelant."""
        if not self._connections:
            return
        dead: list[WebSocket] = []
        # Copie : le set peut muter (déconnexion) pendant l'itération asynchrone.
        for ws in list(self._connections):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._connections.discard(ws)


notification_hub = NotificationHub()


def manual_payment_notification(
    *,
    mp_id: Any,
    created_at: Any,
    operator: str,
    first_name: str,
    last_name: str,
    formula_name: str,
) -> dict[str, Any]:
    """Construit la notification « paiement manuel en attente » au format
    AdminNotification (front). Partagé entre le seed HTTP (dashboard) et le push
    WS (orders) pour garantir un `id` et un format identiques (dédup côté store)."""
    return {
        "id": f"mp-{mp_id}",
        "kind": "manual_pending",
        "title": "Nouveau paiement manuel",
        "body": f"{first_name} {last_name} — {formula_name} ({operator})",
        "at": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
        "read": False,
        "urgent": True,
        "href": "/admin/paiements",
    }
