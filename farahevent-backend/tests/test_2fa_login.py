"""Login admin + invariant anti-verrouillage 2FA (le secret non confirmé ne bloque pas)."""
import pyotp

from tests.factories import make_admin


async def test_login_without_2fa_returns_tokens(client, db):
    await make_admin(db, role="super_admin", email="a@t.io")
    await db.commit()
    r = await client.post("/api/v1/admin/auth/login", json={"email": "a@t.io", "password": "x"})
    assert r.status_code == 200, r.text
    assert r.json()["access_token"]


async def test_pending_2fa_does_not_lock_login(client, db):
    # Secret temporaire posé mais PAS confirmé → le login reste 200 (audit §C.1).
    admin = await make_admin(db, role="super_admin", email="b@t.io")
    admin.two_factor_secret_temp = "PENDINGSECRET234567"
    await db.commit()
    r = await client.post("/api/v1/admin/auth/login", json={"email": "b@t.io", "password": "x"})
    assert r.status_code == 200  # PAS 202


async def test_active_2fa_requires_otp(client, db):
    admin = await make_admin(db, role="super_admin", email="c@t.io")
    admin.two_factor_secret = pyotp.random_base32()
    await db.commit()
    r = await client.post("/api/v1/admin/auth/login", json={"email": "c@t.io", "password": "x"})
    assert r.status_code == 202  # 2fa_required


async def test_wrong_password_rejected(client, db):
    await make_admin(db, role="super_admin", email="d@t.io")
    await db.commit()
    r = await client.post("/api/v1/admin/auth/login", json={"email": "d@t.io", "password": "wrong"})
    assert r.status_code == 401
