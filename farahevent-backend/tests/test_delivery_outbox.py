"""Livraison des billets — outbox transactionnel (T3.10).

Le défaut corrigé était le pire possible pour une billetterie : **argent encaissé,
billet jamais livré**, sans trace. `send_tickets_bg` partait en fire-and-forget,
sans retry, et sortait en silence sur `if not tickets: return` s'il gagnait la
course contre le commit.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.delivery_job import DeliveryJob
from app.services import delivery_service as ds
from app.services.ticket_service import ticket_service
from tests.factories import make_event, make_formula, make_order, make_participant


@pytest_asyncio.fixture
async def paid_order(db):
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=10)
    p = await make_participant(db)  # ticket_delivery_pref = "both"
    o = await make_order(db, ev, f, p, status="PAID")
    await db.flush()
    return o, p


async def _jobs(db, order_id):
    return (
        await db.execute(
            select(DeliveryJob).where(DeliveryJob.order_id == order_id).order_by(DeliveryJob.channel)
        )
    ).scalars().all()


# ------------------------------------------------- l'atomicité, le cœur du fix


async def test_issuing_a_ticket_enqueues_its_delivery(db, paid_order):
    o, p = paid_order
    await ticket_service.generate_for_order(o, db)
    await db.commit()

    jobs = await _jobs(db, o.id)
    assert {j.channel for j in jobs} == {"email", "whatsapp"}  # pref = both
    assert all(j.status == "pending" and j.attempts == 0 for j in jobs)


async def test_rollback_leaves_no_phantom_job(db, paid_order):
    """LA propriété qui manquait : le job naît dans la transaction du billet. Si
    la commande rollback, il ne doit rester aucune livraison programmée — sinon
    on enverrait un billet qui n'existe pas."""
    o, p = paid_order
    await ticket_service.generate_for_order(o, db)
    await db.rollback()

    assert await _jobs(db, o.id) == []


async def test_delivery_pref_email_only_enqueues_one_channel(db):
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=10)
    p = await make_participant(db)
    p.ticket_delivery_pref = "email"
    o = await make_order(db, ev, f, p, status="PAID")
    await db.flush()

    await ticket_service.generate_for_order(o, db)
    await db.commit()

    assert [j.channel for j in await _jobs(db, o.id)] == ["email"]


async def test_reissuing_does_not_duplicate_jobs(db, paid_order):
    """Rejeu de webhook / re-validation : `generate_for_order` est idempotent, la
    livraison doit l'être aussi. Sinon l'acheteur reçoit deux fois son billet."""
    o, p = paid_order
    await ticket_service.generate_for_order(o, db)
    await db.commit()
    await ticket_service.generate_for_order(o, db)
    await db.commit()

    assert len(await _jobs(db, o.id)) == 2  # et non 4


# ---------------------------------------------------------------- retry / DLQ


async def test_transient_failure_is_retried_with_backoff(db, paid_order):
    """Le scénario réel : Resend indisponible 30 secondes. Avant, le billet était
    perdu définitivement."""
    o, p = paid_order
    await ticket_service.generate_for_order(o, db)
    await db.commit()

    with patch.object(ds, "_send", new=AsyncMock(side_effect=RuntimeError("Resend 503"))):
        counts = await ds.process_due_jobs(db)
    await db.commit()

    assert counts["retried"] == 2 and counts["dead"] == 0
    for j in await _jobs(db, o.id):
        assert j.status == "pending", "un échec transitoire ne doit pas abandonner"
        assert j.attempts == 1
        assert j.next_attempt_at > datetime.now(timezone.utc)
        assert "Resend 503" in j.last_error


async def test_job_not_due_is_not_claimed(db, paid_order):
    """Le backoff est porté par `next_attempt_at`, pas par un sleep : un job
    programmé plus tard ne doit pas être repris tout de suite."""
    o, p = paid_order
    await ticket_service.generate_for_order(o, db)
    for j in await _jobs(db, o.id):
        j.next_attempt_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    await db.commit()

    assert await ds.claim_due_jobs(db) == []


async def test_gives_up_after_max_attempts_into_dead_letter(db, paid_order):
    """Une adresse définitivement invalide ne doit pas être retentée à l'infini —
    mais l'abandon doit être VISIBLE, pas silencieux."""
    o, p = paid_order
    await ticket_service.generate_for_order(o, db)
    await db.commit()

    with patch.object(ds, "_send", new=AsyncMock(side_effect=RuntimeError("boom"))), \
         patch.object(ds, "_notify_dead_letter", new=AsyncMock()) as notify:
        for _ in range(ds.MAX_ATTEMPTS):
            for j in await _jobs(db, o.id):
                j.next_attempt_at = datetime.now(timezone.utc) - timedelta(seconds=1)
            await db.commit()
            await ds.process_due_jobs(db)
            await db.commit()

    jobs = await _jobs(db, o.id)
    assert all(j.status == "failed" for j in jobs), "dead letter attendue"
    assert all(j.attempts == ds.MAX_ATTEMPTS for j in jobs)
    assert notify.await_count == 2, "l'abandon doit alerter un humain"

    # Une dead letter ne se reprend plus toute seule.
    assert await ds.claim_due_jobs(db) == []


async def test_success_marks_sent_and_stops(db, paid_order):
    o, p = paid_order
    await ticket_service.generate_for_order(o, db)
    await db.commit()

    with patch.object(ds, "_send", new=AsyncMock(return_value=True)):
        counts = await ds.process_due_jobs(db)
    await db.commit()

    assert counts["sent"] == 2
    assert all(j.status == "sent" and j.last_error is None for j in await _jobs(db, o.id))
    assert await ds.claim_due_jobs(db) == []


async def test_provider_returning_false_counts_as_failure(db, paid_order):
    """`email_service.send_ticket_confirmation` renvoie False au lieu de lever :
    sans ce traitement, un refus du provider passerait pour un succès."""
    o, p = paid_order
    await ticket_service.generate_for_order(o, db)
    await db.commit()

    with patch.object(ds, "_send", new=AsyncMock(return_value=False)):
        counts = await ds.process_due_jobs(db)
    await db.commit()

    assert counts["sent"] == 0 and counts["retried"] == 2


async def test_one_channel_failing_does_not_block_the_other(db, paid_order):
    """Jobs par CANAL et non par commande : si WhatsApp tombe, l'email part
    quand même — et un retry ne renverra pas l'email déjà livré."""
    o, p = paid_order
    await ticket_service.generate_for_order(o, db)
    await db.commit()

    async def half_broken(db_, job):
        if job.channel == "whatsapp":
            raise RuntimeError("OpenWA down")
        return True

    with patch.object(ds, "_send", new=AsyncMock(side_effect=half_broken)):
        await ds.process_due_jobs(db)
    await db.commit()

    by_channel = {j.channel: j for j in await _jobs(db, o.id)}
    assert by_channel["email"].status == "sent"
    assert by_channel["whatsapp"].status == "pending"


# ---------------------------------------------------------------- ré-envoi


async def test_requeue_revives_a_dead_letter(db, paid_order):
    """Le ré-envoi doit pouvoir relancer une livraison abandonnée — sinon la dead
    letter est un cul-de-sac et l'acheteur n'a aucun recours."""
    o, p = paid_order
    await ticket_service.generate_for_order(o, db)
    for j in await _jobs(db, o.id):
        j.status, j.attempts, j.last_error = "failed", ds.MAX_ATTEMPTS, "boom"
    await db.commit()

    await ds.requeue_for_order(db, o, p)
    await db.commit()

    for j in await _jobs(db, o.id):
        assert j.status == "pending" and j.attempts == 0 and j.last_error is None


@pytest.mark.parametrize("attempts,expected_min", [(1, 30), (2, 60), (3, 120)])
def test_backoff_grows_exponentially(attempts, expected_min):
    assert ds._backoff(attempts).total_seconds() == expected_min
