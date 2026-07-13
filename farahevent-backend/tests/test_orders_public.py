"""Création de commande publique (anonyme) + garde-fous (mode paiement, stock, upload)."""
from tests.factories import (
    make_event,
    make_formula,
    make_order,
    make_payment_config,
)

PARTICIPANT = {
    "first_name": "A",
    "last_name": "B",
    "email": "buyer@t.io",
    "whatsapp": "+2250700000000",
    "country": "CI",
}


async def test_create_manual_order(client, db):
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=5, channel="presentiel")
    await make_payment_config(db, ev, digital=False, manual=True)
    await db.commit()
    r = await client.post("/api/v1/orders/", json={
        "event_id": str(ev.id), "formula_id": str(f.id),
        "participant": PARTICIPANT, "payment_mode": "manual",
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["payment_mode"] == "manual"
    assert body["manual_upload_hint"]


async def test_create_digital_order_returns_checkout_url(client, db):
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=5, channel="presentiel")
    await make_payment_config(db, ev, digital=True, manual=False)
    await db.commit()
    r = await client.post("/api/v1/orders/", json={
        "event_id": str(ev.id), "formula_id": str(f.id),
        "participant": PARTICIPANT, "payment_mode": "digital",
    })
    assert r.status_code == 201, r.text
    assert r.json()["checkout_url"]  # stub PayDunya → URL d'attente


async def test_manual_order_rejected_when_disabled(client, db):
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=5)
    await make_payment_config(db, ev, digital=True, manual=False)
    await db.commit()
    r = await client.post("/api/v1/orders/", json={
        "event_id": str(ev.id), "formula_id": str(f.id),
        "participant": PARTICIPANT, "payment_mode": "manual",
    })
    assert r.status_code == 400


async def test_sold_out_formula_rejected(client, db):
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=1)
    f.sold_quantity = 1  # épuisé
    await make_payment_config(db, ev, digital=True, manual=True)
    await db.commit()
    r = await client.post("/api/v1/orders/", json={
        "event_id": str(ev.id), "formula_id": str(f.id),
        "participant": PARTICIPANT, "payment_mode": "digital",
    })
    assert r.status_code == 409


async def test_manual_payment_upload_rejects_non_image(client, db):
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=5)
    from tests.factories import make_participant
    p = await make_participant(db)
    o = await make_order(db, ev, f, p, status="PENDING", provider="manual")
    await db.commit()
    r = await client.post(
        f"/api/v1/orders/{o.id}/manual-payment",
        data={"operator": "western_union", "sender_name": "X", "sender_country": "FR"},
        files={"receipt": ("x.txt", b"hello world", "text/plain")},
    )
    assert r.status_code == 415  # MIME non autorisé (JPEG/PNG only)
