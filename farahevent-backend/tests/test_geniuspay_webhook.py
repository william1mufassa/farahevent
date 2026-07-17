"""Webhook GeniusPay — le chemin par lequel un paiement devient un billet.

Tout est validé avec un IPN **signé simulé** : les tests fabriquent leur propre
secret et signent eux-mêmes. Aucune clé réelle, aucun appel réseau — un test qui
dépendrait d'une vraie clé ne serait pas un test mais un appel d'intégration.
"""
import hashlib
import hmac
import json
import time
from unittest.mock import patch

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.api.v1.endpoints import webhooks
from app.core.config import settings
from app.models.ticket import Ticket
from app.services.geniuspay_provider import GeniusPayProvider
from tests.factories import make_event, make_formula, make_order, make_participant

_SECRET = "whsec_secret_de_test_pour_signature"
_URL = "/api/v1/webhooks/geniuspay"


@pytest.fixture(autouse=True)
def _geniuspay_active(monkeypatch):
    """Active GeniusPay comme provider du webhook + neutralise la livraison.

    En test, GENIUSPAY_API_KEY est vide => `_select_provider` choisit le stub, dont
    `verify_webhook_signature` renvoie False (fail-closed) et rejetterait tout.
    """
    monkeypatch.setattr(settings, "GENIUSPAY_WEBHOOK_SECRET", _SECRET)
    monkeypatch.setattr(webhooks, "payment_provider", GeniusPayProvider())
    with patch("app.services.ticket_service.TicketService.send_tickets_bg"):
        yield


def _sign(body: bytes, ts: str, secret: str = _SECRET) -> str:
    return hmac.new(secret.encode(), f"{ts}.".encode() + body, hashlib.sha256).hexdigest()


def _payload(order_id, status="completed", reference="MTX-TEST123"):
    return {
        "success": True,
        "data": {
            "id": 456,
            "reference": reference,
            "amount": 1000,
            "fees": 45,
            "net_amount": 955,
            "status": status,
            "metadata": {"order_id": str(order_id)},
        },
    }


async def _post(client, payload, *, ts=None, secret=_SECRET, signature=None, body=None):
    """Poste un webhook. `content=` et non `json=` : on doit signer les octets
    EXACTS qui partent, sinon la signature ne colle pas."""
    raw = body if body is not None else json.dumps(payload).encode()
    ts = ts or str(int(time.time()))
    sig = signature if signature is not None else _sign(raw, ts, secret)
    return await client.post(
        _URL,
        content=raw,
        headers={
            "X-Webhook-Signature": sig,
            "X-Webhook-Timestamp": ts,
            "X-Webhook-Event": "payment.success",
            "Content-Type": "application/json",
        },
    )


@pytest_asyncio.fixture
async def order(db):
    ev = await make_event(db)
    f = await make_formula(db, ev, stock=10)
    p = await make_participant(db)
    o = await make_order(db, ev, f, p, status="PENDING", provider="geniuspay")
    await db.commit()
    return o


# ----------------------------------------------------------------- chemin nominal


async def test_valid_webhook_marks_paid_and_issues_ticket(client, db, order):
    r = await _post(client, _payload(order.id))

    assert r.status_code == 200, r.text
    assert r.json()["handled"] is True

    await db.refresh(order)
    assert order.status == "PAID"
    # La référence provider est tracée : sans elle, la réconciliation ne saurait
    # pas quelle transaction interroger si un webhook se perdait ensuite.
    assert order.payment_provider_checkout_id == "MTX-TEST123"

    tickets = (
        await db.execute(select(Ticket).where(Ticket.order_id == order.id))
    ).scalars().all()
    assert len(tickets) == 1


# ------------------------------------------------------------------- authenticité


async def test_forged_signature_is_rejected(client, db, order):
    r = await _post(client, _payload(order.id), signature="deadbeef")

    assert r.status_code == 401
    await db.refresh(order)
    assert order.status == "PENDING"  # aucun effet de bord


async def test_wrong_secret_is_rejected(client, db, order):
    r = await _post(client, _payload(order.id), secret="whsec_mauvais_secret")

    assert r.status_code == 401
    await db.refresh(order)
    assert order.status == "PENDING"


async def test_tampered_body_is_rejected(client, db, order):
    """Signature valide pour un corps, mais un AUTRE corps est envoyé.

    C'est l'attaque qui compte : intercepter un webhook légitime et gonfler le
    montant. Elle échoue parce qu'on signe le corps brut reçu.
    """
    legit = json.dumps(_payload(order.id)).encode()
    ts = str(int(time.time()))
    sig = _sign(legit, ts)

    tampered = json.dumps(_payload(order.id, reference="MTX-PIRATE")).encode()
    r = await _post(client, None, body=tampered, ts=ts, signature=sig)

    assert r.status_code == 401
    await db.refresh(order)
    assert order.status == "PENDING"


async def test_missing_signature_is_rejected(client, order):
    r = await _post(client, _payload(order.id), signature="")
    assert r.status_code == 401


# ---------------------------------------------------------------------- anti-rejeu


async def test_old_timestamp_is_rejected(client, db, order):
    old = str(int(time.time()) - 3600)  # 1 h => hors fenêtre de 5 min
    r = await _post(client, _payload(order.id), ts=old)

    assert r.status_code == 401
    await db.refresh(order)
    assert order.status == "PENDING"


async def test_future_timestamp_is_rejected(client, order):
    future = str(int(time.time()) + 3600)
    r = await _post(client, _payload(order.id), ts=future)
    assert r.status_code == 401


async def test_non_numeric_timestamp_is_rejected(client, order):
    r = await _post(client, _payload(order.id), ts="pas-un-nombre")
    assert r.status_code == 401


# --------------------------------------------------------------------- idempotence


async def test_replay_of_valid_webhook_is_idempotent(client, db, order):
    """Le provider REJOUE tant qu'il n'a pas de 2xx : ce n'est pas un cas limite.
    Un rejeu ne doit pas émettre un second billet ni décompter deux fois le stock."""
    r1 = await _post(client, _payload(order.id))
    assert r1.status_code == 200

    r2 = await _post(client, _payload(order.id))
    assert r2.status_code == 200
    assert r2.json()["reason"] == "already_paid"

    tickets = (
        await db.execute(select(Ticket).where(Ticket.order_id == order.id))
    ).scalars().all()
    assert len(tickets) == 1, "un rejeu a émis un second billet"

    await db.refresh(order)
    assert order.status == "PAID"


# ------------------------------------------------------------- statuts et cas mous


async def test_failed_status_marks_order_failed(client, db, order):
    r = await _post(client, _payload(order.id, status="failed"))

    assert r.status_code == 200
    await db.refresh(order)
    assert order.status == "FAILED"


async def test_pending_status_is_a_noop(client, db, order):
    r = await _post(client, _payload(order.id, status="processing"))

    assert r.status_code == 200
    assert r.json()["handled"] is False
    await db.refresh(order)
    assert order.status == "PENDING"


async def test_unknown_order_returns_200_to_stop_retries(client):
    """Signé mais inexploitable : renvoyer une erreur ferait retenter le provider
    en boucle pour une commande qui n'existera jamais."""
    r = await _post(client, _payload("6a339bad-5ae8-4327-80eb-0c4d22f7ab74"))

    assert r.status_code == 200
    assert r.json()["handled"] is False
    assert r.json()["reason"] == "order_not_found"


async def test_missing_order_id_returns_200(client):
    payload = {"success": True, "data": {"reference": "MTX-X", "status": "completed"}}
    r = await _post(client, payload)

    assert r.status_code == 200
    assert r.json()["reason"] == "missing_order_id"
