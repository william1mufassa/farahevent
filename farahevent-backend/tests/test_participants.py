"""Liste participants : total, facettes, filtre par statut."""
from tests.factories import make_admin, make_event, make_formula, make_order, make_participant


async def test_participants_total_facets_and_status_filter(client, db, auth_as):
    admin = await make_admin(db, role="manager")
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=100)
    p1 = await make_participant(db, email="a@t.io")
    p2 = await make_participant(db, email="b@t.io")
    await make_order(db, ev, f, p1, status="PAID")
    await make_order(db, ev, f, p2, status="PENDING")
    await db.commit()
    auth_as(admin)

    r = await client.get("/api/v1/admin/participants")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 2
    assert body["facets"]["formulas"] == ["Std"]
    assert body["facets"]["countries"] == ["CI"]

    # Filtre statut 'paid' → une seule ligne.
    r2 = await client.get("/api/v1/admin/participants?status=paid")
    assert r2.json()["total"] == 1
    assert r2.json()["rows"][0]["status"] == "paid"
