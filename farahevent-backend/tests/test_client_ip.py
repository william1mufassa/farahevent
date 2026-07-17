"""Résolution de l'IP appelante pour l'audit trail — T2.6.

Deux défauts cumulés (audit 2026-07-16) :
- le proxy BFF ne transmettait AUCUN header d'IP → toutes les actions admin
  portaient l'IP du serveur Next. Un audit trail où chaque ligne a la même IP ne
  sert à rien le jour où l'on demande « qui a fait ça ? » ;
- le backend lisait `x-forwarded-for` BRUT. nginx y AJOUTE
  (`$proxy_add_x_forwarded_for`) : la première entrée vient du client, donc
  n'importe qui pouvait écrire l'IP de son choix dans l'audit.
"""
from types import SimpleNamespace

import pytest

from app.services.audit_service import client_ip


def _req(headers=None, client_host="10.0.0.1"):
    return SimpleNamespace(
        headers=headers or {},
        client=SimpleNamespace(host=client_host) if client_host else None,
    )


def test_prefers_x_real_ip():
    """nginx ÉCRASE X-Real-IP avec $remote_addr : c'est le seul header qu'un
    client ne peut pas forger."""
    r = _req({"x-real-ip": "41.66.1.9", "x-forwarded-for": "1.1.1.1"})
    assert client_ip(r) == "41.66.1.9"


def test_forged_x_real_ip_loses_against_nginx():
    """Un client qui envoie son propre X-Real-IP ne gagne rien : nginx l'écrase
    avant que la requête n'atteigne l'app. Ce test documente le contrat — il
    dépend de `proxy_set_header X-Real-IP $remote_addr` dans infra/nginx/."""
    r = _req({"x-real-ip": "41.66.1.9"})  # valeur telle qu'nginx l'a posée
    assert client_ip(r) == "41.66.1.9"


def test_xff_takes_the_last_hop_not_the_first():
    """`$proxy_add_x_forwarded_for` AJOUTE : « <ce que le client prétend>, <vrai> ».
    Prendre la première entrée, c'est croire le client sur parole."""
    r = _req({"x-forwarded-for": "666.evil.forge, 41.66.1.9"})
    assert client_ip(r) == "41.66.1.9"


def test_xff_single_value():
    assert client_ip(_req({"x-forwarded-for": "41.66.1.9"})) == "41.66.1.9"


def test_xff_whitespace_is_trimmed():
    r = _req({"x-forwarded-for": "  1.1.1.1 ,   41.66.1.9  "})
    assert client_ip(r) == "41.66.1.9"


def test_raw_xff_string_is_never_stored():
    """L'ancien comportement : la chaîne entière finissait dans la colonne
    `ip_address`. Falsifiable, et illisible."""
    r = _req({"x-forwarded-for": "1.1.1.1, 2.2.2.2, 41.66.1.9"})
    assert client_ip(r) == "41.66.1.9"
    assert "," not in client_ip(r)


def test_falls_back_to_socket_peer():
    assert client_ip(_req({}, client_host="10.0.0.1")) == "10.0.0.1"


def test_no_client_no_crash():
    assert client_ip(_req({}, client_host=None)) is None
    assert client_ip(None) is None


def test_value_is_bounded():
    """La colonne est un INET/VARCHAR : une valeur démesurée ferait échouer
    l'INSERT, donc perdre la trace d'audit — au pire moment."""
    r = _req({"x-real-ip": "9" * 500})
    assert len(client_ip(r)) <= 45


@pytest.mark.parametrize("empty", ["", "   ", ",", " , "])
def test_empty_xff_falls_through(empty):
    r = _req({"x-forwarded-for": empty}, client_host="10.0.0.1")
    assert client_ip(r) == "10.0.0.1"
