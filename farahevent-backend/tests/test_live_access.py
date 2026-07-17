"""Accès participant au Live — `POST /live/access`.

Endpoint jusqu'ici sans aucun test, alors qu'il garde une ressource payante.
Deux bugs s'y masquaient mutuellement (audit 2026-07-16) :
- le gate exigeait PAID et excluait MANUAL_VALIDATED — or le digital n'encaissant
  pas, TOUS les clients réels sont MANUAL_VALIDATED : personne ne pouvait entrer ;
- l'accès se décidait sur `event.mode` au lieu de `formula.channel` — un billet
  présentiel-only d'un hybride ouvrait le Live (fuite de revenu).
Le premier cachait le second : la porte était fermée à tous, donc on ne voyait pas
qu'elle laissait aussi passer les mauvaises personnes.
"""
from app.core.security import decode_live_token
from tests.factories import make_event, make_formula, make_order, make_participant

_URL = "/api/v1/live/access"


async def _setup(db, *, order_status="MANUAL_VALIDATED", event_mode="hybrid", channel="online"):
    ev = await make_event(db, mode=event_mode)
    f = await make_formula(db, ev, channel=channel)
    p = await make_participant(db)
    o = await make_order(db, ev, f, p, status=order_status)
    await db.commit()
    return ev, f, p, o


# ------------------------------------------------------- statut de la commande


async def test_manual_validated_order_grants_access(client, db):
    """LE bug qui fermait le Live à tout le monde : le paiement manuel est la
    seule voie qui encaisse réellement aujourd'hui."""
    ev, f, p, o = await _setup(db, order_status="MANUAL_VALIDATED")

    r = await client.post(_URL, json={"order_ref": str(o.id), "email": p.email})

    assert r.status_code == 200, r.text
    claims = decode_live_token(r.json()["token"])
    assert claims["sub"] == str(p.id)
    assert claims["event_id"] == str(ev.id)
    assert claims["type"] == "live_access"


async def test_paid_order_grants_access(client, db):
    ev, f, p, o = await _setup(db, order_status="PAID")
    r = await client.post(_URL, json={"order_ref": str(o.id), "email": p.email})
    assert r.status_code == 200


async def test_pending_order_is_refused(client, db):
    ev, f, p, o = await _setup(db, order_status="PENDING")
    r = await client.post(_URL, json={"order_ref": str(o.id), "email": p.email})
    assert r.status_code == 403


async def test_refunded_order_is_refused(client, db):
    """Remboursé = plus de droit au Live, comme le QR devient inscannable."""
    ev, f, p, o = await _setup(db, order_status="REFUNDED")
    r = await client.post(_URL, json={"order_ref": str(o.id), "email": p.email})
    assert r.status_code == 403


# ------------------------------------------------- canal de la formule (revenu)


async def test_presentiel_only_ticket_on_hybrid_event_is_refused(client, db):
    """Fuite de revenu : l'événement est hybride, mais ce billet-là n'a pas payé
    le Live. C'est la formule achetée qui décide, pas le mode de l'événement."""
    ev, f, p, o = await _setup(db, event_mode="hybrid", channel="presentiel")

    r = await client.post(_URL, json={"order_ref": str(o.id), "email": p.email})

    assert r.status_code == 403
    assert "ne donne pas accès au Live" in r.json()["detail"]


async def test_both_channel_ticket_grants_access(client, db):
    ev, f, p, o = await _setup(db, event_mode="hybrid", channel="both")
    r = await client.post(_URL, json={"order_ref": str(o.id), "email": p.email})
    assert r.status_code == 200


async def test_presentiel_event_has_no_live(client, db):
    ev, f, p, o = await _setup(db, event_mode="presentiel", channel="presentiel")
    r = await client.post(_URL, json={"order_ref": str(o.id), "email": p.email})
    assert r.status_code == 403
    assert "ne dispose pas de Live" in r.json()["detail"]


# --------------------------------------------------------- identité / recherche


async def test_wrong_email_is_refused(client, db):
    ev, f, p, o = await _setup(db)
    r = await client.post(_URL, json={"order_ref": str(o.id), "email": "autre@x.io"})
    assert r.status_code == 404


async def test_wildcard_ref_cannot_match_any_ticket(client, db):
    """`ref_input` est interpolé dans un ILIKE : `%` matchait N'IMPORTE QUEL billet
    de cet email. L'entrée est désormais bornée à l'alphabet d'une référence."""
    ev, f, p, o = await _setup(db)

    for evil in ["%", "%%", "_", "%a%"]:
        r = await client.post(_URL, json={"order_ref": evil, "email": p.email})
        assert r.status_code == 404, f"le joker {evil!r} a matché un billet"


async def test_unknown_ref_is_refused(client, db):
    ev, f, p, o = await _setup(db)
    r = await client.post(
        _URL, json={"order_ref": "6a339bad-5ae8-4327-80eb-0c4d22f7ab74", "email": p.email}
    )
    assert r.status_code == 404
