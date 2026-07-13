"""Réconciliation des paiements PENDING orphelins (filet anti-webhook-manqué)."""
from datetime import datetime, timedelta, timezone

from app.services.reconciliation_service import reconcile_pending_orders
from tests.factories import make_event, make_formula, make_order, make_participant


class _FakeProvider:
    async def get_status(self, checkout_id):
        if checkout_id.startswith("PAID"):
            return "paid"
        if checkout_id.startswith("FAIL"):
            return "failed"
        return "pending"


async def test_reconcile_resolves_orphans(db):
    now = datetime.now(timezone.utc)
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=100)
    p = await make_participant(db)

    a = await make_order(db, ev, f, p, status="PENDING", provider="fake",
                         checkout_id="PAID-a", created_at=now - timedelta(minutes=10))
    b = await make_order(db, ev, f, p, status="PENDING", provider="fake",
                         checkout_id="FAIL-b", created_at=now - timedelta(minutes=10))
    d = await make_order(db, ev, f, p, status="PENDING", provider="fake",
                         checkout_id="PEND-d", created_at=now - timedelta(hours=25))  # stale
    e = await make_order(db, ev, f, p, status="PENDING", provider="fake",
                         checkout_id="PAID-e", created_at=now - timedelta(minutes=1))  # trop récent
    await db.commit()

    counts = await reconcile_pending_orders(db, provider=_FakeProvider(), now=now)
    await db.commit()

    assert a.status == "PAID"      # payé → billets émis
    assert b.status == "FAILED"    # échec confirmé
    assert d.status == "FAILED"    # pending mais trop vieux → abandonné
    assert e.status == "PENDING"   # trop récent → laissé (chance au webhook)
    assert counts == {
        "checked": 3, "paid": 1, "failed": 1, "stale_failed": 1, "still_pending": 0,
    }
    # Le paiement 'a' a bien émis une place.
    assert f.sold_quantity == 1
