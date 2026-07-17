"""Provider GeniusPay — conformité au contrat de l'API (doc du 2026-07-16).

Ces tests verrouillent les écarts trouvés en confrontant le code à la doc : ils
auraient tous échoué avant S1, et l'API les aurait sinon rejetés au PREMIER
paiement réel — le pire moment pour le découvrir.
"""
from unittest.mock import AsyncMock, patch

import pytest

from app.core.config import settings
from app.services.geniuspay_provider import GeniusPayError, GeniusPayProvider
from app.services.payment_provider import CustomerInfo, StubPaymentProvider

provider = GeniusPayProvider()


def _response(status_code=201, body=None):
    r = AsyncMock()
    r.status_code = status_code
    r.content = b"{}"
    r.json = lambda: body if body is not None else {
        "success": True,
        "data": {
            "reference": "MTX-A1B2C3",
            "payment_url": "https://pay/x",
            "fees": 450,
            "net_amount": 14550,
            "status": "pending",
        },
    }
    return r


async def _capture_payload(**kwargs):
    """Appelle create_checkout avec httpx mocké et renvoie le payload envoyé."""
    defaults = dict(
        order_id="o-1", amount=15000, currency="XOF", description="d",
        success_url="https://s", cancel_url="https://c", webhook_url="https://w",
    )
    defaults.update(kwargs)
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=_response())) as post:
        await provider.create_checkout(**defaults)
    return post.await_args.kwargs["json"]


# ------------------------------------------------------ enum payment_method (écart 1&2)


async def test_mobile_money_is_translated_to_pawapay():
    """'mobile_money' n'est PAS une valeur GeniusPay : elle serait rejetée telle
    quelle. On route vers pawapay, qui choisit l'opérateur d'après le numéro."""
    payload = await _capture_payload(payment_method="mobile_money")
    assert payload["payment_method"] == "pawapay"


async def test_card_is_sent_as_is():
    """'card' EST une valeur valide : le remapper vers paystack était inutile."""
    payload = await _capture_payload(payment_method="card")
    assert payload["payment_method"] == "card"


async def test_unknown_method_is_omitted_not_forwarded():
    """Repli sûr : on omet le champ (checkout hébergé) plutôt que d'envoyer une
    valeur que l'API rejettera."""
    payload = await _capture_payload(payment_method="bitcoin")
    assert "payment_method" not in payload


async def test_no_method_means_hosted_checkout():
    payload = await _capture_payload(payment_method=None)
    assert "payment_method" not in payload


@pytest.mark.parametrize("method", ["wave", "pawapay", "paystack", "orange_money", "mtn_money", "card"])
async def test_all_documented_methods_pass_through(method):
    payload = await _capture_payload(payment_method=method)
    assert payload["payment_method"] == method


# ------------------------------------------------------------ objet customer (écart 3)


async def test_customer_is_sent_when_provided():
    """Sans le numéro, GeniusPay ne peut pas auto-router le mobile money et
    l'acheteur doit le ressaisir chez le provider."""
    payload = await _capture_payload(
        payment_method="mobile_money",
        customer=CustomerInfo(name="A B", email="a@b.io", phone="+2250700000000", country="CI"),
    )
    assert payload["customer"] == {
        "name": "A B", "email": "a@b.io", "phone": "+2250700000000", "country": "CI",
    }


async def test_customer_omits_empty_fields():
    payload = await _capture_payload(customer=CustomerInfo(name="A B"))
    assert payload["customer"] == {"name": "A B"}


async def test_no_customer_key_when_absent():
    payload = await _capture_payload()
    assert "customer" not in payload


# ------------------------------------------------------------ montant minimum (écart 4)


async def test_amount_below_minimum_is_rejected_before_network():
    """Min 200 XOF (doc). Mieux vaut échouer ici qu'après un aller-retour réseau
    avec une erreur opaque en plein tunnel d'achat."""
    with pytest.raises(GeniusPayError, match="minimum"):
        await provider.create_checkout(
            order_id="o", amount=100, currency="XOF", description="d",
            success_url="s", cancel_url="c", webhook_url="w",
        )


async def test_amount_at_minimum_passes():
    payload = await _capture_payload(amount=200)
    assert payload["amount"] == 200


# ------------------------------------------------------------------ frais réels


async def test_real_fees_are_returned_not_estimated():
    """GeniusPay annonce les frais réels : seule valeur qui réconciliera avec le
    relevé. Les ignorer garantissait un écart comptable (audit §11)."""
    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=_response())):
        session = await provider.create_checkout(
            order_id="o", amount=15000, currency="XOF", description="d",
            success_url="s", cancel_url="c", webhook_url="w",
        )
    assert session.fees == 450.0
    assert session.net_amount == 14550.0
    assert session.checkout_id == "MTX-A1B2C3"
    assert session.checkout_url == "https://pay/x"


# ------------------------------------------------------------------ payload de base


async def test_payload_uses_documented_field_names():
    payload = await _capture_payload()
    # success_url / error_url : noms exacts de la doc (pas cancel_url).
    assert payload["error_url"] == "https://c"
    assert payload["success_url"] == "https://s"
    # metadata.order_id : seul lien avec la commande, réémis dans le webhook.
    assert payload["metadata"] == {"order_id": "o-1"}


async def test_description_is_truncated_to_500():
    payload = await _capture_payload(description="x" * 900)
    assert len(payload["description"]) == 500


# ------------------------------------------------------------------- get_status


@pytest.mark.parametrize(
    "gp_status,expected",
    [
        ("completed", "paid"),
        ("pending", "pending"),
        ("processing", "pending"),
        ("failed", "failed"),
        ("expired", "failed"),
        ("cancelled", "failed"),
        ("un_statut_inconnu", "pending"),  # jamais "paid" par défaut
    ],
)
async def test_status_mapping(gp_status, expected):
    r = _response(200, {"success": True, "data": {"status": gp_status}})
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=r)):
        assert await provider.get_status("MTX-1") == expected


async def test_unknown_transaction_stays_pending_not_failed():
    """404 => on ne marque PAS failed : une transaction que le provider ne connaît
    pas encore ne doit pas annuler la commande d'un acheteur qui vient de payer."""
    r = _response(404, {})
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=r)):
        assert await provider.get_status("MTX-inconnu") == "pending"


# --------------------------------------------------------- signature (fail-closed)


def test_signature_without_secret_is_refused(monkeypatch):
    monkeypatch.setattr(settings, "GENIUSPAY_WEBHOOK_SECRET", "")
    assert provider.verify_webhook_signature(
        timestamp="1", raw_body=b"{}", signature="abc"
    ) is False


def test_stub_provider_refuses_all_webhooks():
    """Fail-closed du contrat : un provider sans vérification ne doit jamais
    laisser passer un webhook — sinon n'importe qui forge un paiement."""
    assert StubPaymentProvider().verify_webhook_signature(
        timestamp="1", raw_body=b"{}", signature="abc"
    ) is False
