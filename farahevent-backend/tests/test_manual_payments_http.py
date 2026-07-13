"""Validation d'un paiement manuel via l'API : génère les billets, puis 409 si stock épuisé."""
from tests.factories import (
    make_admin,
    make_event,
    make_formula,
    make_manual_payment,
    make_order,
    make_participant,
)


async def test_validate_generates_tickets_then_409_on_stock(client, db, auth_as):
    admin = await make_admin(db, role="super_admin")
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=1)  # une seule place
    p = await make_participant(db)
    o1 = await make_order(db, ev, f, p, status="MANUAL_PENDING")
    mp1 = await make_manual_payment(db, o1)
    o2 = await make_order(db, ev, f, p, status="MANUAL_PENDING")
    mp2 = await make_manual_payment(db, o2)
    await db.commit()

    auth_as(admin)

    r1 = await client.post(f"/api/v1/admin/manual-payments/{mp1.id}/validate")
    assert r1.status_code == 200, r1.text
    assert r1.json()["tickets_generated"] == 1

    # 2e validation : plus de stock → 409 (rollback, l'order reste MANUAL_PENDING).
    r2 = await client.post(f"/api/v1/admin/manual-payments/{mp2.id}/validate")
    assert r2.status_code == 409, r2.text
