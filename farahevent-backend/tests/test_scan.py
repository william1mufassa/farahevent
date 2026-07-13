"""Scan QR : un billet valide passe une fois, le 2e scan est rejeté (single-use)."""
from app.services.ticket_service import ticket_service
from tests.factories import make_admin, make_event, make_formula, make_order, make_participant


async def test_qr_scan_is_single_use(client, db, auth_as):
    ev = await make_event(db, status="open")
    f = await make_formula(db, ev, stock=10, channel="presentiel")
    p = await make_participant(db)
    o = await make_order(db, ev, f, p, status="PAID")
    tickets = await ticket_service.generate_for_order(o, db)
    qr = next(t for t in tickets if t.type == "qr")
    token = qr.qr_token
    await db.commit()

    agent = await make_admin(db, role="agent")
    await db.commit()
    auth_as(agent)

    # 1er scan : valide.
    r1 = await client.post("/api/v1/tickets/scan", json={"qr_token": token})
    assert r1.status_code == 200, r1.text
    assert r1.json()["valid"] is True

    # 2e scan du même billet : rejeté (déjà scanné).
    r2 = await client.post("/api/v1/tickets/scan", json={"qr_token": token})
    body = r2.json()
    assert body["valid"] is False
    assert body["reason"] == "already_scanned"


async def test_forged_qr_is_rejected(client, db, auth_as):
    agent = await make_admin(db, role="agent")
    await db.commit()
    auth_as(agent)
    r = await client.post("/api/v1/tickets/scan", json={"qr_token": "not-a-valid-jwt"})
    assert r.status_code == 200
    assert r.json()["valid"] is False
    assert r.json()["reason"] == "invalid_token"
