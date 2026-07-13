"""WebSocket admin — auth par ticket, hub de diffusion, push temps réel.

Le handshake WS lui-même (accept/close) est validé en live via le frontend ;
ici on couvre la logique critique testable en isolation : émission/validation du
ticket, RBAC de la route ticket, diffusion du hub, et le push déclenché par une
soumission de paiement manuel.
"""
from app.core.security import create_access_token, create_ws_ticket, decode_ws_ticket
from app.services.notification_hub import NotificationHub, notification_hub
from app.services.upload_service import upload_service
from tests.factories import (
    make_admin,
    make_event,
    make_formula,
    make_order,
    make_participant,
)


# --------------------------------------------------------------- ticket (unitaire)


def test_ws_ticket_roundtrip():
    payload = decode_ws_ticket(create_ws_ticket("admin-123", "manager"))
    assert payload is not None
    assert payload["sub"] == "admin-123"
    assert payload["role"] == "manager"
    assert payload["type"] == "ws_ticket"


def test_ws_ticket_rejects_empty_and_garbage():
    assert decode_ws_ticket("") is None
    assert decode_ws_ticket("not.a.jwt") is None


def test_ws_ticket_rejects_access_token():
    # Séparation des types : un jeton de session ne doit jamais ouvrir le WS.
    assert decode_ws_ticket(create_access_token({"sub": "admin-123"})) is None


# ---------------------------------------------------------- GET /admin/ws-ticket (RBAC)


async def test_ws_ticket_endpoint_grants_manager(client, db, auth_as):
    mgr = await make_admin(db, role="manager")
    await db.commit()
    auth_as(mgr)
    r = await client.get("/api/v1/admin/ws-ticket")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["expires_in"] > 0
    payload = decode_ws_ticket(body["ticket"])
    assert payload is not None
    assert payload["sub"] == str(mgr.id)
    assert payload["role"] == "manager"


async def test_ws_ticket_endpoint_forbids_agent(client, db, auth_as):
    agent = await make_admin(db, role="agent")
    await db.commit()
    auth_as(agent)
    r = await client.get("/api/v1/admin/ws-ticket")
    assert r.status_code == 403


# ------------------------------------------------------------------- hub (unitaire)


async def test_hub_broadcasts_and_prunes_dead():
    class FakeWS:
        def __init__(self, fail=False):
            self.fail = fail
            self.sent = []

        async def send_json(self, msg):
            if self.fail:
                raise RuntimeError("socket morte")
            self.sent.append(msg)

    hub = NotificationHub()
    good, dead = FakeWS(), FakeWS(fail=True)
    hub.register(good)
    hub.register(dead)
    assert hub.count == 2

    message = {"type": "notification", "notification": {"id": "x"}}
    await hub.broadcast(message)

    assert good.sent == [message]
    assert hub.count == 1  # la socket morte est retirée du registre


# ------------------------------------------------ push sur soumission (intégration)


async def test_manual_payment_submission_pushes_notification(client, db, monkeypatch):
    ev = await make_event(db, status="open")
    f = await make_formula(db, ev, stock=5, channel="presentiel")
    p = await make_participant(db)
    o = await make_order(db, ev, f, p, status="PENDING", provider="manual")
    await db.commit()

    captured: list[dict] = []

    async def fake_broadcast(msg):
        captured.append(msg)

    async def fake_save(_upload):
        return "receipts/test.jpg"

    monkeypatch.setattr(notification_hub, "broadcast", fake_broadcast)
    monkeypatch.setattr(upload_service, "save_receipt", fake_save)

    r = await client.post(
        f"/api/v1/orders/{o.id}/manual-payment",
        data={"operator": "ria", "sender_name": "Jean", "sender_country": "FR"},
        files={"receipt": ("r.jpg", b"\xff\xd8\xff" + b"\x00" * 64, "image/jpeg")},
    )
    assert r.status_code == 201, r.text

    assert len(captured) == 1
    msg = captured[0]
    assert msg["type"] == "notification"
    notif = msg["notification"]
    assert notif["kind"] == "manual_pending"
    assert notif["urgent"] is True
    assert notif["id"].startswith("mp-")
    assert "ria" in notif["body"]  # "A B — Std (ria)"
