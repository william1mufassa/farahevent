"""Créer un compte super_admin depuis la CLI.

Usage :
    python -m scripts.create_super_admin <email> <password> <first_name> <last_name>

Exemple :
    python -m scripts.create_super_admin admin@farahevent.tech "Str0ngP@ss!" William Mickey
"""
import asyncio
import sys
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.admin import Admin
from app.models.enums import AdminRole


async def create(email: str, password: str, first_name: str, last_name: str):
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(Admin).where(Admin.email == email))
        if existing.scalar_one_or_none():
            print(f"[!] Un admin existe déjà avec l'email {email}")
            return

        admin = Admin(
            email=email,
            password_hash=hash_password(password),
            first_name=first_name,
            last_name=last_name,
            role=AdminRole.SUPER_ADMIN.value,
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        await db.refresh(admin)
        print(f"[OK] Super admin créé : {admin.email} (id={admin.id})")


def main():
    if len(sys.argv) != 5:
        print(__doc__)
        sys.exit(1)
    _, email, password, first_name, last_name = sys.argv
    asyncio.run(create(email, password, first_name, last_name))


if __name__ == "__main__":
    main()
