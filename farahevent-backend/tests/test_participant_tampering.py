"""T2.3 / T2.4 — vol de billet et fuite PII sur les endpoints ANONYMES.

Deux failles trouvées à l'audit du 2026-07-16, toutes deux exploitables avec pour
seule connaissance **l'email d'un acheteur** — jamais un mot de passe, jamais un
compte.
"""
from unittest.mock import patch

import pytest
import pytest_asyncio

from app.api.v1.endpoints.tickets import _mask_email, _mask_phone
from app.models.ticket import Ticket
from tests.factories import (
    make_event,
    make_formula,
    make_order,
    make_participant,
    make_payment_config,
)

_VICTIM_PHONE = "+2250700000000"
_ATTACKER_PHONE = "+2250799999999"


@pytest.fixture(autouse=True)
def _no_real_delivery():
    with patch("app.services.ticket_service.TicketService.send_tickets_bg"):
        yield


@pytest_asyncio.fixture
async def event(db):
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=50)
    await make_payment_config(db, ev, digital=False, manual=True)
    await db.commit()
    return ev, f


def _order_body(event, formula, email, phone):
    return {
        "event_id": str(event.id),
        "formula_id": str(formula.id),
        "payment_mode": "manual",
        "participant": {
            "first_name": "Awa", "last_name": "Diallo", "email": email,
            "whatsapp": phone, "country": "CI", "city": "Abidjan",
            "ticket_delivery_pref": "both",
        },
    }


# ------------------------------------------- T2.3 : écrasement des coordonnées


async def test_attacker_cannot_hijack_a_paid_participant_phone(client, db, event):
    """L'attaque : la victime a payé. L'attaquant, qui connaît juste son email,
    passe une commande sur le même événement avec SON numéro. Sans le gel, le
    numéro de la victime était réécrit — et la re-livraison partait chez lui."""
    ev, f = event
    victim = await make_participant(db, email="victime@x.io")
    victim.whatsapp = _VICTIM_PHONE
    o = await make_order(db, ev, f, victim, status="MANUAL_VALIDATED")
    db.add(Ticket(order_id=o.id, participant_id=victim.id, event_id=ev.id,
                  formula_id=f.id, type="qr"))
    await db.commit()
    victim_id = victim.id

    r = await client.post(
        "/api/v1/orders/", json=_order_body(ev, f, "victime@x.io", _ATTACKER_PHONE)
    )
    assert r.status_code == 201, r.text  # la commande est acceptée…

    db.expire_all()
    victim = await db.get(type(victim), victim_id)
    # …mais les coordonnées de la victime sont INTACTES.
    assert victim.whatsapp == _VICTIM_PHONE, "le numéro de la victime a été réécrit"


async def test_attacker_cannot_hijack_name_of_paid_participant(client, db, event):
    ev, f = event
    victim = await make_participant(db, email="v2@x.io")
    victim.first_name, victim.last_name = "Vraie", "Personne"
    o = await make_order(db, ev, f, victim, status="PAID")
    await db.commit()
    victim_id = victim.id

    await client.post("/api/v1/orders/", json=_order_body(ev, f, "v2@x.io", _ATTACKER_PHONE))

    db.expire_all()
    victim = await db.get(type(victim), victim_id)
    assert (victim.first_name, victim.last_name) == ("Vraie", "Personne")


async def test_unpaid_participant_can_still_correct_their_details(client, db, event):
    """Le gel ne doit PAS casser le cas légitime : tant qu'aucun billet n'existe,
    l'acheteur corrige librement une faute de frappe."""
    ev, f = event
    p = await make_participant(db, email="typo@x.io")
    p.whatsapp = "+2250700000001"
    await make_order(db, ev, f, p, status="PENDING")
    await db.commit()
    pid = p.id

    r = await client.post(
        "/api/v1/orders/", json=_order_body(ev, f, "typo@x.io", "+2250711111111")
    )
    assert r.status_code == 201

    db.expire_all()
    p = await db.get(type(p), pid)
    assert p.whatsapp == "+2250711111111", "la correction légitime a été bloquée"


# ------------------------------------------------- T2.4 : fuite PII sur /resend


async def test_resend_does_not_leak_phone_in_clear(client, db, event):
    """Il suffisait de connaître l'email d'un acheteur pour que l'API recrache son
    numéro de téléphone en clair."""
    ev, f = event
    p = await make_participant(db, email="cible@x.io")
    p.whatsapp = _VICTIM_PHONE
    o = await make_order(db, ev, f, p, status="PAID")
    db.add(Ticket(order_id=o.id, participant_id=p.id, event_id=ev.id,
                  formula_id=f.id, type="qr"))
    await db.commit()

    r = await client.post(
        "/api/v1/tickets/resend", json={"order_id": str(o.id), "email": "cible@x.io"}
    )

    assert r.status_code == 200, r.text
    body = r.text
    assert _VICTIM_PHONE not in body, "le numéro fuite en clair"
    assert "cible@x.io" not in body, "l'email fuite en clair"
    assert "0000" in body  # 4 derniers chiffres : l'acheteur se reconnaît


async def test_resend_wildcard_cannot_match_any_ticket(client, db, event):
    """`order_id="%"` matchait n'importe quel billet de cet email."""
    ev, f = event
    p = await make_participant(db, email="joker@x.io")
    o = await make_order(db, ev, f, p, status="PAID")
    db.add(Ticket(order_id=o.id, participant_id=p.id, event_id=ev.id,
                  formula_id=f.id, type="qr"))
    await db.commit()

    for evil in ["%", "%%", "_", "%a%"]:
        r = await client.post(
            "/api/v1/tickets/resend", json={"order_id": evil, "email": "joker@x.io"}
        )
        assert r.status_code == 404, f"le joker {evil!r} a matché un billet"


# ----------------------------------------------------------------- masquage


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("awa.diallo@gmail.com", "aw•••@gmail.com"),
        ("a@b.io", "a•••@b.io"),
        ("pas-un-email", "votre email"),
        (None, "votre email"),
    ],
)
def test_mask_email(raw, expected):
    assert _mask_email(raw) == expected


def test_mask_phone_keeps_only_last_four():
    masked = _mask_phone("+2250700000000")
    assert masked.endswith("0000")
    assert "+225" not in masked
    assert _mask_phone(None) == "votre WhatsApp"
