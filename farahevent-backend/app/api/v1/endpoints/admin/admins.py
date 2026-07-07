"""CRUD admins — Super Admin uniquement."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password, require_roles
from app.models.admin import Admin
from app.models.enums import AdminRole
from app.schemas.admin import AdminCreate, AdminOut, AdminUpdate
from app.services.audit_service import audit_service

router = APIRouter()

_super = require_roles(AdminRole.SUPER_ADMIN)


def _to_out(a: Admin) -> AdminOut:
    return AdminOut(
        id=str(a.id),
        email=a.email,
        first_name=a.first_name,
        last_name=a.last_name,
        role=a.role,
        is_active=a.is_active,
        two_factor_enabled=a.two_factor_secret is not None,
        last_login_at=a.last_login_at,
        created_at=a.created_at,
    )


@router.get("/", response_model=list[AdminOut])
async def list_admins(_admin: Admin = Depends(_super), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Admin).order_by(Admin.created_at.desc()))
    return [_to_out(a) for a in result.scalars().all()]


@router.post("/", response_model=AdminOut, status_code=status.HTTP_201_CREATED)
async def create_admin(
    data: AdminCreate,
    request: Request,
    admin: Admin = Depends(_super),
    db: AsyncSession = Depends(get_db),
):
    exists = await db.execute(select(Admin).where(Admin.email == data.email))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email déjà utilisé")

    new = Admin(
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        role=data.role.value,
        is_active=True,
    )
    db.add(new)
    await db.flush()
    await db.refresh(new)

    await audit_service.log(
        db,
        admin=admin,
        action="admin.create",
        resource_type="admin",
        resource_id=str(new.id),
        payload={"email": new.email, "role": new.role},
        request=request,
    )
    return _to_out(new)


@router.get("/{admin_id}", response_model=AdminOut)
async def get_admin(
    admin_id: str, _admin: Admin = Depends(_super), db: AsyncSession = Depends(get_db)
):
    a = await _load(db, admin_id)
    return _to_out(a)


@router.patch("/{admin_id}", response_model=AdminOut)
async def update_admin(
    admin_id: str,
    data: AdminUpdate,
    request: Request,
    admin: Admin = Depends(_super),
    db: AsyncSession = Depends(get_db),
):
    a = await _load(db, admin_id)
    changes = {}
    if data.first_name is not None:
        a.first_name = data.first_name; changes["first_name"] = data.first_name
    if data.last_name is not None:
        a.last_name = data.last_name; changes["last_name"] = data.last_name
    if data.role is not None:
        a.role = data.role.value; changes["role"] = data.role.value
    if data.is_active is not None:
        a.is_active = data.is_active; changes["is_active"] = data.is_active
    if data.password is not None:
        a.password_hash = hash_password(data.password); changes["password"] = "***"

    await audit_service.log(
        db, admin=admin, action="admin.update",
        resource_type="admin", resource_id=str(a.id),
        payload=changes, request=request,
    )
    return _to_out(a)


@router.delete("/{admin_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_admin(
    admin_id: str,
    request: Request,
    admin: Admin = Depends(_super),
    db: AsyncSession = Depends(get_db),
):
    a = await _load(db, admin_id)
    if a.id == admin.id:
        raise HTTPException(status_code=409, detail="Impossible de se désactiver soi-même")
    a.is_active = False
    await audit_service.log(
        db, admin=admin, action="admin.deactivate",
        resource_type="admin", resource_id=str(a.id),
        request=request,
    )


async def _load(db: AsyncSession, admin_id: str) -> Admin:
    try:
        parsed = uuid.UUID(admin_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="admin_id invalide")
    result = await db.execute(select(Admin).where(Admin.id == parsed))
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Admin non trouvé")
    return a
