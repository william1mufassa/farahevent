"""Émission des billets : idempotence, garde de stock (anti-oversell), formule 'both'."""
import pytest

from app.services.ticket_service import StockExceededError, ticket_service
from tests.factories import make_event, make_formula, make_order, make_participant


async def test_idempotent_and_stock_guard(db):
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=1, channel="presentiel")
    p = await make_participant(db)

    o1 = await make_order(db, ev, f, p, status="MANUAL_VALIDATED")
    t1 = await ticket_service.generate_for_order(o1, db)
    assert len(t1) == 1
    assert f.sold_quantity == 1

    # Idempotent : re-générer ne crée pas de billet ni de double décompte.
    t1b = await ticket_service.generate_for_order(o1, db)
    assert len(t1b) == 1
    assert f.sold_quantity == 1

    # Stock épuisé : une 2e commande refuse l'émission.
    o2 = await make_order(db, ev, f, p, status="MANUAL_VALIDATED")
    with pytest.raises(StockExceededError):
        await ticket_service.generate_for_order(o2, db)
    assert f.sold_quantity == 1  # inchangé


async def test_both_formula_counts_one_place(db):
    ev = await make_event(db, mode="hybrid")
    f = await make_formula(db, ev, stock=10, channel="both")
    p = await make_participant(db)
    o = await make_order(db, ev, f, p, status="PAID")

    tickets = await ticket_service.generate_for_order(o, db)
    assert len(tickets) == 2  # QR (présentiel) + live (online)
    assert f.sold_quantity == 1  # une commande = une place, pas deux
