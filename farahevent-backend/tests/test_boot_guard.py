"""Boot-guard de production — refuse de démarrer sur une config non sûre.

Ce garde est la dernière ligne entre un `.env` incomplet et une prod ouverte.
Il n'avait aucun test : rien ne garantissait qu'il attrape encore quoi que ce
soit après un refactor de `config.py`.

Il vise une classe précise de défauts : ceux qui **s'éteignent en silence**. Une
clé manquante ne provoque ni erreur, ni log, ni symptôme visible — juste une
protection absente. Mieux vaut un boot qui échoue bruyamment.
"""
import pytest

from app.core.config import Settings

_VALID = dict(
    APP_ENV="production",
    DEBUG=False,
    SECRET_KEY="x" * 40,
    TICKET_SIGNING_KEY="y" * 40,
    DATABASE_URL="postgresql+asyncpg://u:vraimotdepasse@h:5432/db",
    TURNSTILE_SECRET_KEY="0x_turnstile_secret",
    REVALIDATE_SECRET="revalidate-secret",
    _env_file=None,  # ignore le .env du disque : le test décrit sa propre config
)


def _settings(**overrides):
    return Settings(**{**_VALID, **overrides})


def test_valid_production_config_boots():
    s = _settings()
    assert s.APP_ENV == "production"


def test_development_is_never_blocked():
    """Le garde ne doit gêner personne en dev — sinon on le contourne."""
    s = Settings(APP_ENV="development", _env_file=None)
    assert s.APP_ENV == "development"


@pytest.mark.parametrize(
    "override,expected",
    [
        ({"SECRET_KEY": "change-this-secret-key-in-production"}, "SECRET_KEY"),
        ({"SECRET_KEY": "trop-court"}, "SECRET_KEY"),
        ({"DEBUG": True}, "DEBUG"),
        ({"DATABASE_URL": "postgresql+asyncpg://u:password@h:5432/db"}, "mot de passe"),
        ({"TICKET_SIGNING_KEY": ""}, "TICKET_SIGNING_KEY"),
        ({"TICKET_SIGNING_KEY": "z" * 10}, "TICKET_SIGNING_KEY"),
        # Ajoutés le 2026-07-17 : les deux dernières protections qui s'éteignaient
        # sans bruit.
        ({"TURNSTILE_SECRET_KEY": ""}, "TURNSTILE_SECRET_KEY"),
        ({"REVALIDATE_SECRET": ""}, "REVALIDATE_SECRET"),
    ],
)
def test_production_refuses_unsafe_config(override, expected):
    with pytest.raises(ValueError, match=expected):
        _settings(**override)


def test_ticket_key_must_differ_from_secret_key():
    """Clés séparées : une rotation/fuite de l'une ne doit pas compromettre
    l'autre. Les réutiliser annulerait tout l'intérêt de la séparation."""
    same = "k" * 40
    with pytest.raises(ValueError, match="DIFFÉRENT"):
        _settings(SECRET_KEY=same, TICKET_SIGNING_KEY=same)


def test_all_problems_are_reported_at_once():
    """Un garde qui ne signale qu'un défaut à la fois force N redéploiements pour
    corriger N erreurs. Il doit tout dire du premier coup."""
    with pytest.raises(ValueError) as e:
        _settings(DEBUG=True, TURNSTILE_SECRET_KEY="", REVALIDATE_SECRET="")
    msg = str(e.value)
    assert "DEBUG" in msg and "TURNSTILE_SECRET_KEY" in msg and "REVALIDATE_SECRET" in msg
