"""Barème des frais — T2.10.

Ce calcul vivait dans le handler HTTP de `POST /orders/` : pour le tester il
fallait monter une requête, une base, un événement et une formule. Résultat : il
n'était pas testé du tout, alors qu'il décide de ce que l'acheteur paie.
"""
from decimal import Decimal

import pytest

from app.services.pricing_service import quote


def test_manual_payment_has_no_fee():
    """Le paiement manuel (WU/RIA/MoneyGram) ne passe par aucun provider :
    lui ajouter des frais de provider serait facturer un service inexistant."""
    q = quote(base_price=25000, payment_mode="manual", payment_method="western_union")
    assert q.fee == 0
    assert q.total == q.base == Decimal("25000")


def test_unknown_method_charges_no_invented_fee():
    """Un moyen inconnu ne doit pas produire une estimation fantaisiste facturée
    au client : frais à zéro, et le provider tranchera."""
    q = quote(base_price=10000, payment_mode="digital", payment_method="bitcoin")
    assert q.fee == 0


def test_no_method_means_no_fee():
    q = quote(base_price=10000, payment_mode="digital", payment_method=None)
    assert q.fee == 0


@pytest.mark.parametrize(
    "method,fixed", [("mobile_money", 100), ("card", 200)]
)
def test_gross_up_nets_the_base_price(method, fixed):
    """LE test qui compte : après prélèvement du provider sur le TOTAL, il doit
    rester AU MOINS le prix de la formule. C'est toute la raison d'être du
    gross-up — facturer `base + frais` ne suffirait pas, le pourcentage
    s'appliquant aussi aux frais."""
    for base in (200, 1000, 25000, 150000):
        q = quote(base_price=base, payment_mode="digital", payment_method=method)
        preleve = q.total * Decimal("0.035") + fixed
        net = q.total - preleve
        assert net >= Decimal(base), f"{method} @ {base} : il manque {Decimal(base) - net} F"


def test_rounding_never_loses_a_franc():
    """Arrondi au SUPÉRIEUR : à l'inférieur, on encaisserait un franc de moins
    que le prix affiché, à chaque vente."""
    for base in range(200, 3000):
        q = quote(base_price=base, payment_mode="digital", payment_method="mobile_money")
        assert q.total == q.total.to_integral_value(), "montant non entier en XOF"
        net = q.total - (q.total * Decimal("0.035") + 100)
        assert net >= Decimal(base)


def test_card_costs_more_than_mobile_money():
    a = quote(base_price=10000, payment_mode="digital", payment_method="mobile_money")
    b = quote(base_price=10000, payment_mode="digital", payment_method="card")
    assert b.fee > a.fee


def test_total_is_always_base_plus_fee():
    q = quote(base_price=25000, payment_mode="digital", payment_method="card")
    assert q.total == q.base + q.fee


def test_accepts_the_types_the_orm_returns():
    """`formula.price` remonte en Decimal depuis SQLAlchemy, mais les tests et
    fixtures passent des int/str. Aucun appelant ne doit avoir à convertir."""
    for value in (25000, "25000", 25000.0, Decimal("25000")):
        q = quote(base_price=value, payment_mode="digital", payment_method="card")
        assert q.base == Decimal("25000")
