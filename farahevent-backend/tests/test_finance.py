"""Bilan financier + remboursement (gross/refunded/net/pending)."""
from tests.factories import make_admin, make_event, make_formula, make_order, make_participant


async def test_finance_summary_and_refund(client, db, auth_as):
    admin = await make_admin(db, role="super_admin")
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=100)
    p = await make_participant(db)
    paid = await make_order(db, ev, f, p, status="PAID")
    await make_order(db, ev, f, p, status="PENDING")
    await make_order(db, ev, f, p, status="REFUNDED")
    await db.commit()
    auth_as(admin)

    s = (await client.get("/api/v1/admin/finance")).json()["summary"]
    assert s["gross"] == 2000       # payé + remboursé (1000 + 1000)
    assert s["refunded"] == 1000
    assert s["net"] == 1000          # gross - refunded
    assert s["pending"] == 1000

    r = await client.post(f"/api/v1/admin/transactions/{paid.id}/refund")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "REFUNDED"

    s2 = (await client.get("/api/v1/admin/finance")).json()["summary"]
    assert s2["refunded"] == 2000
    assert s2["net"] == 0


async def test_refund_only_paid_orders(client, db, auth_as):
    admin = await make_admin(db, role="super_admin")
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=100)
    p = await make_participant(db)
    pending = await make_order(db, ev, f, p, status="PENDING")
    await db.commit()
    auth_as(admin)
    r = await client.post(f"/api/v1/admin/transactions/{pending.id}/refund")
    assert r.status_code == 409  # une commande non payée n'est pas remboursable
