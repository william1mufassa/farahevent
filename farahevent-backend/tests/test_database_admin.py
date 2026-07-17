"""Endpoints /admin/database — corbeille, hard-delete, reset.

Le module le plus destructeur de l'API, et le SEUL des 13 modules de mutation
admin sans `audit_service` (audit 2026-07-16). Zéro test jusqu'ici : modifier une
FAQ était tracé, détruire un événement et toute sa billetterie ne l'était pas.
"""
import pytest
from sqlalchemy import func, select

from app.models.audit_log import AuditLog
from app.models.enums import AdminRole
from app.models.event import Event
from app.models.order import Order
from app.models.participant import Participant
from app.models.ticket import Ticket
from tests.factories import (
    make_admin,
    make_event,
    make_formula,
    make_order,
    make_participant,
)

_BASE = "/api/v1/admin/database"


async def _admin(db, auth_as, role=AdminRole.SUPER_ADMIN.value):
    """Crée un admin, le COMMIT, et l'injecte dans l'auth.

    Le commit est indispensable : l'endpoint tourne dans SA propre session et
    n'a aucune visibilité sur un admin seulement flushé côté test. L'écriture du
    log d'audit violerait alors audit_logs.admin_id_fkey.
    """
    a = await make_admin(db, role=role)
    await db.commit()
    auth_as(a)
    return a


async def _count_events(db, event_id) -> int:
    """Compte en base, sans passer par l'identity map.

    L'endpoint écrit dans SA session ; `db.get()` côté test renverrait une copie
    mise en cache et masquerait le vrai état. Un COUNT force l'aller-retour.
    """
    db.expire_all()
    return await db.scalar(select(func.count(Event.id)).where(Event.id == event_id))


async def _event_with_sales(db, order_status="PAID"):
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=10)
    p = await make_participant(db)
    o = await make_order(db, ev, f, p, status=order_status)
    t = Ticket(
        order_id=o.id, participant_id=p.id, event_id=ev.id,
        formula_id=f.id, type="qr",
    )
    db.add(t)
    await db.flush()
    await db.commit()
    return ev, f, p, o


# ------------------------------------------------------------------------ RBAC


async def test_manager_cannot_hard_delete(client, db, auth_as):
    """Un MANAGER pilote un événement ; il ne doit pas pouvoir l'effacer
    définitivement. Le hard-delete est irréversible : super_admin seulement."""
    ev = await make_event(db)
    await db.commit()
    await _admin(db, auth_as, AdminRole.MANAGER.value)

    r = await client.delete(f"{_BASE}/events/{ev.id}/hard-delete")

    assert r.status_code == 403


async def test_manager_cannot_reset(client, db, auth_as):
    ev = await make_event(db)
    await db.commit()
    await _admin(db, auth_as, AdminRole.MANAGER.value)

    r = await client.post(f"{_BASE}/events/{ev.id}/reset", json={"reset_scans": True})

    assert r.status_code == 403


async def test_agent_cannot_list_deleted_events(client, db, auth_as):
    await _admin(db, auth_as, AdminRole.AGENT.value)
    r = await client.get(f"{_BASE}/deleted-events")
    assert r.status_code == 403


# --------------------------------------------------------- garde « ventes réelles »


async def test_hard_delete_refused_when_paid_orders_exist(client, db, auth_as):
    """Effacer un événement qui a encaissé, c'est effacer la preuve comptable et
    la liste des ayants droit. Refus net."""
    ev, f, p, o = await _event_with_sales(db, order_status="PAID")
    await _admin(db, auth_as)

    r = await client.delete(f"{_BASE}/events/{ev.id}/hard-delete")

    assert r.status_code == 409
    assert await _count_events(db, ev.id) == 1


async def test_reset_refused_when_paid_orders_exist(client, db, auth_as):
    ev, f, p, o = await _event_with_sales(db, order_status="MANUAL_VALIDATED")
    await _admin(db, auth_as)

    r = await client.post(
        f"{_BASE}/events/{ev.id}/reset", json={"reset_orders": True}
    )

    assert r.status_code == 409
    ev_id = ev.id                      # capture AVANT expire_all
    db.expire_all()
    assert (await db.scalar(select(func.count(Order.id)).where(Order.event_id == ev_id))) == 1


async def test_hard_delete_works_without_sales(client, db, auth_as):
    ev = await make_event(db)
    await make_formula(db, ev)
    await db.commit()
    await _admin(db, auth_as)

    r = await client.delete(f"{_BASE}/events/{ev.id}/hard-delete")

    assert r.status_code in (200, 204), r.text
    assert await _count_events(db, ev.id) == 0


async def test_reset_unknown_event_is_404(client, db, auth_as):
    await _admin(db, auth_as)
    r = await client.post(
        f"{_BASE}/events/6a339bad-5ae8-4327-80eb-0c4d22f7ab74/reset",
        json={"reset_scans": True},
    )
    assert r.status_code == 404


# ------------------------------------------------------------- reset : intégrité


async def test_reset_orders_removes_tickets_and_orders(client, db, auth_as):
    ev, f, p, o = await _event_with_sales(db, order_status="PENDING")
    await _admin(db, auth_as)

    r = await client.post(f"{_BASE}/events/{ev.id}/reset", json={"reset_orders": True})

    assert r.status_code in (200, 204), r.text
    ev_id = ev.id                      # capture AVANT expire_all
    db.expire_all()
    assert (await db.scalar(select(func.count(Order.id)).where(Order.event_id == ev_id))) == 0
    assert (await db.scalar(select(func.count(Ticket.id)).where(Ticket.event_id == ev_id))) == 0


async def test_reset_participants_does_not_violate_fk(client, db, auth_as):
    """`orders.participant_id` est en NO ACTION et Participant n'a AUCUNE cascade
    ORM : supprimer les participants avant les commandes qui les référencent
    violait la contrainte."""
    ev, f, p, o = await _event_with_sales(db, order_status="PENDING")
    await _admin(db, auth_as)

    r = await client.post(
        f"{_BASE}/events/{ev.id}/reset",
        json={"reset_orders": True, "reset_participants": True},
    )

    assert r.status_code in (200, 204), r.text
    db.expire_all()
    assert (await db.scalar(select(func.count(Participant.id)))) == 0


async def test_reset_participants_alone_is_refused(client, db, auth_as):
    """Supprimer les participants en gardant leurs commandes laisserait des
    commandes orphelines : incohérent, donc refusé."""
    ev, f, p, o = await _event_with_sales(db, order_status="PENDING")
    await _admin(db, auth_as)

    r = await client.post(
        f"{_BASE}/events/{ev.id}/reset", json={"reset_participants": True}
    )

    assert r.status_code == 409
    db.expire_all()
    assert (await db.scalar(select(func.count(Participant.id)))) == 1


# ------------------------------------------------------------------ audit trail


async def test_hard_delete_is_audited(client, db, auth_as):
    ev = await make_event(db)
    await db.commit()
    await _admin(db, auth_as)

    await client.delete(f"{_BASE}/events/{ev.id}/hard-delete")

    logs = (await db.execute(select(AuditLog))).scalars().all()
    assert len(logs) == 1, "la destruction d'un événement n'est pas tracée"
    assert logs[0].action == "event.hard_delete"
    assert logs[0].resource_id == str(ev.id)


async def test_reset_is_audited(client, db, auth_as):
    ev = await make_event(db)
    await db.commit()
    await _admin(db, auth_as)

    await client.post(f"{_BASE}/events/{ev.id}/reset", json={"reset_scans": True})

    logs = (await db.execute(select(AuditLog))).scalars().all()
    assert len(logs) == 1
    assert logs[0].action == "event.reset"
    # Le payload doit dire CE QUI a été purgé, sinon la trace ne vaut rien.
    assert logs[0].payload["reset_scans"] is True


async def test_restore_is_audited(client, db, auth_as):
    ev = await make_event(db)
    ev.is_deleted = True
    await db.commit()
    await _admin(db, auth_as)

    r = await client.post(f"{_BASE}/events/{ev.id}/restore")

    assert r.status_code == 200, r.text
    logs = (await db.execute(select(AuditLog))).scalars().all()
    assert len(logs) == 1
    assert logs[0].action == "event.restore"
