"""Transitions de statut événement (matrice draft→open→live/closed)."""
from tests.factories import make_admin, make_event


async def test_valid_transition_draft_to_open(client, db, auth_as):
    admin = await make_admin(db, role="manager")
    ev = await make_event(db, status="draft")
    await db.commit()
    auth_as(admin)
    r = await client.patch(f"/api/v1/admin/events/{ev.id}/status", json={"status": "open"})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "open"


async def test_invalid_transition_draft_to_closed(client, db, auth_as):
    admin = await make_admin(db, role="manager")
    ev = await make_event(db, status="draft")
    await db.commit()
    auth_as(admin)
    r = await client.patch(f"/api/v1/admin/events/{ev.id}/status", json={"status": "closed"})
    assert r.status_code == 409  # transition interdite par la matrice
