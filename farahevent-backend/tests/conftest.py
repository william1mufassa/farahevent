"""Fixtures pytest — base de test Postgres dédiée, client HTTP ASGI, override d'auth.

Prérequis : lancer avec DATABASE_URL pointant sur une base de TEST jetable
(ex: farahevent_test). Le schéma est créé via Base.metadata ; les tables sont
tronquées avant chaque test pour l'isolation.
"""
import asyncio

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.database import AsyncSessionLocal, Base, engine
from app.core.rate_limit import limiter
from app.core.security import get_current_admin
from app.main import app

# Rate-limit désactivé pendant les tests (sinon interférences entre cas).
limiter.enabled = False


@pytest.fixture(scope="session")
def event_loop():
    """Boucle unique pour toute la session : le pool de connexions de l'engine
    global reste attaché à une seule loop (évite 'attached to a different loop')."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _schema():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest_asyncio.fixture(autouse=True)
async def _clean():
    """Tronque toutes les tables avant chaque test (isolation)."""
    async with engine.begin() as conn:
        tables = ", ".join(t.name for t in reversed(Base.metadata.sorted_tables))
        if tables:
            await conn.exec_driver_sql(f"TRUNCATE {tables} RESTART IDENTITY CASCADE")
    yield


@pytest_asyncio.fixture
async def db():
    async with AsyncSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
def auth_as():
    """Injecte un admin donné en surchargeant get_current_admin (RBAC testable)."""
    def _set(admin):
        app.dependency_overrides[get_current_admin] = lambda: admin

    yield _set
    app.dependency_overrides.pop(get_current_admin, None)
