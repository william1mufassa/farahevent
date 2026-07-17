"""Réconciliation des paiements PENDING orphelins (filet anti-webhook-manqué)."""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest

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


from unittest.mock import patch
from app.services.ticket_service import TicketGenerationError, ticket_service

async def test_reconcile_robustness_on_ticket_error(db):
    now = datetime.now(timezone.utc)
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=100)
    p = await make_participant(db)

    a = await make_order(db, ev, f, p, status="PENDING", provider="fake",
                         checkout_id="PAID-fail-ticket", created_at=now - timedelta(minutes=10))
    b = await make_order(db, ev, f, p, status="PENDING", provider="fake",
                         checkout_id="PAID-success-ticket", created_at=now - timedelta(minutes=10))
    await db.commit()

    # Capturé AVANT le patch : l'échec sur `a` fait rollback son savepoint, ce qui
    # EXPIRE l'instance `a`. Relire `a.id` depuis la closure au tour suivant (ordre
    # `b`) déclencherait un lazy-load async hors greenlet => MissingGreenlet.
    a_id = a.id

    original_generate = ticket_service.generate_for_order
    async def mock_generate(order, session):
        if order.id == a_id:
            raise TicketGenerationError("Simulated error")
        return await original_generate(order, session)

    with patch("app.services.reconciliation_service.ticket_service.generate_for_order", mock_generate):
        counts = await reconcile_pending_orders(db, provider=_FakeProvider(), now=now)
        await db.commit()

    await db.refresh(a)
    await db.refresh(b)
    await db.refresh(f)

    # L'ordre 'a' a échoué (savepoint annulé) -> son statut reste PENDING
    assert a.status == "PENDING"
    # L'ordre 'b' a réussi -> son statut est PAID
    assert b.status == "PAID"
    # Comptes : 2 traités, 1 payé (b), 1 still_pending (a)
    assert counts == {
        "checked": 2, "paid": 1, "failed": 0, "stale_failed": 0, "still_pending": 1,
    }
    assert f.sold_quantity == 1

