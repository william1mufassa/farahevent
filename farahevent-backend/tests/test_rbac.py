"""Contrôle d'accès par rôle (RBAC) sur des endpoints admin représentatifs."""
from tests.factories import make_admin


async def test_agent_forbidden_on_participants(client, db, auth_as):
    agent = await make_admin(db, role="agent")
    await db.commit()
    auth_as(agent)
    r = await client.get("/api/v1/admin/participants")
    assert r.status_code == 403


async def test_manager_allowed_on_participants(client, db, auth_as):
    mgr = await make_admin(db, role="manager")
    await db.commit()
    auth_as(mgr)
    r = await client.get("/api/v1/admin/participants")
    assert r.status_code == 200


async def test_manager_forbidden_on_finance(client, db, auth_as):
    # Finances = Super Admin + Comptable uniquement (Manager exclu).
    mgr = await make_admin(db, role="manager")
    await db.commit()
    auth_as(mgr)
    r = await client.get("/api/v1/admin/finance")
    assert r.status_code == 403
