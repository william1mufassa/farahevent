"""Dashboard : agrégations KPIs + notifications (paiements manuels en attente)."""
from tests.factories import (
    make_admin,
    make_event,
    make_formula,
    make_manual_payment,
    make_order,
    make_participant,
)


async def test_stats_kpis_and_sales(client, db, auth_as):
    admin = await make_admin(db, role="super_admin")
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=100)
    p = await make_participant(db)
    await make_order(db, ev, f, p, status="PAID")
    await make_order(db, ev, f, p, status="MANUAL_VALIDATED")
    await make_order(db, ev, f, p, status="PENDING")  # ne compte pas dans les payés
    await db.commit()
    auth_as(admin)

    r = await client.get("/api/v1/admin/stats?period=30d")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["kpis"]["tickets_sold"] == 2
    assert body["kpis"]["revenue"] == 2000
    assert body["kpis"]["currency"] == "XOF"
    assert body["kpis"]["live_viewers"] is None
    assert body["sales_by_formula"] == [{"formula": "Std", "count": 2}]


async def test_notifications_lists_pending_manual(client, db, auth_as):
    admin = await make_admin(db, role="super_admin")
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=100)
    p = await make_participant(db)
    o = await make_order(db, ev, f, p, status="MANUAL_PENDING")
    await make_manual_payment(db, o, status="pending")
    await db.commit()
    auth_as(admin)

    r = await client.get("/api/v1/admin/notifications")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["kind"] == "manual_pending"
    assert data[0]["urgent"] is True
