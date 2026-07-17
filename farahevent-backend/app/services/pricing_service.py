"""Barème des frais de paiement — source unique de vérité du prix payé.

Extrait de `orders.py` le 2026-07-17 : le calcul du montant facturé vivait dans
le handler HTTP, avec les barèmes en dur au milieu de la validation et de la
création de commande. Conséquences : intestable sans requête HTTP, et invisible
pour qui cherche « combien on facture ».

⚠️ CES FRAIS SONT DES ESTIMATIONS, pas les frais réels du provider.
GeniusPay renvoie les vrais (`fees` / `net_amount`) dans sa réponse ; `orders.py`
les stocke désormais dans `order.metadata_` avec l'écart (`fee_estimate_delta`).
Ce barème sert à afficher un prix AVANT d'appeler le provider — on ne peut pas
connaître le vrai coût sans avoir créé la transaction. Tant que les deux
existent, l'écart doit être surveillé : c'est lui qui fera la différence en
comptabilité.

Modèle : « frais à la charge de l'acheteur » (gross-up). On ne facture pas
`base + frais` — cela ne suffirait pas, car le provider prélève son pourcentage
sur le TOTAL, y compris sur les frais eux-mêmes. On résout donc :

    total - (total x taux + fixe) = base
    <=> total = (base + fixe) / (1 - taux)

Arrondi au SUPÉRIEUR : un arrondi à l'inférieur ferait encaisser un franc de
moins que le prix de la formule, à chaque vente.
"""
from dataclasses import dataclass
from decimal import ROUND_CEILING, Decimal

# Barèmes GeniusPay estimés (à confronter aux `fees` réels une fois les premières
# transactions passées — cf. fee_estimate_delta). Un seul endroit à corriger le
# jour où le contrat change.
_RATE = Decimal("0.035")  # ~3,5 % prélevés sur le total
_FIXED_BY_METHOD: dict[str, Decimal] = {
    "mobile_money": Decimal("100"),  # part fixe, en XOF
    "card": Decimal("200"),
}


@dataclass(frozen=True)
class Quote:
    """Décomposition du prix. `total` est ce que l'acheteur paie."""
    base: Decimal
    fee: Decimal
    total: Decimal


def quote(
    *, base_price: Decimal | int | float | str, payment_mode: str, payment_method: str | None
) -> Quote:
    """Prix à facturer pour une formule donnée.

    Le paiement manuel (Western Union/RIA/MoneyGram) ne passe par aucun provider :
    aucun frais n'est ajouté. Un moyen inconnu n'invente pas de barème — frais à
    zéro plutôt qu'une estimation fantaisiste facturée au client.
    """
    base = Decimal(str(base_price))

    if payment_mode != "digital" or not payment_method:
        return Quote(base=base, fee=Decimal("0"), total=base)

    fixed = _FIXED_BY_METHOD.get(payment_method)
    if fixed is None:
        return Quote(base=base, fee=Decimal("0"), total=base)

    total = ((base + fixed) / (Decimal(1) - _RATE)).quantize(
        Decimal("1"), rounding=ROUND_CEILING
    )
    return Quote(base=base, fee=total - base, total=total)
