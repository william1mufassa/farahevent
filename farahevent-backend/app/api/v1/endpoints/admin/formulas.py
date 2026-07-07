"""CRUD formules — scoped par événement."""
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles
from app.models.admin import Admin
from app.models.enums import AdminRole
from app.models.event import Event
from app.models.formula import Formula
from app.schemas.event_admin import FormulaAdminOut, FormulaCreate, FormulaUpdate
from app.services.audit_service import audit_service

router = APIRouter()
_manager = require_roles(AdminRole.SUPER_ADMIN, AdminRole.MANAGER)


def _to_out(f: Formula) -> FormulaAdminOut:
    return FormulaAdminOut(
        id=str(f.id),
        event_id=str(f.event_id),
        name=f.name,
        description=f.description,
        advantages=f.advantages,
        price=float(f.price),
        currency=f.currency,
        channel=f.channel,
        stock=f.stock,
        sold_quantity=f.sold_quantity,
        is_active=f.is_active,
        sort_order=f.sort_order,
    )


@router.get("/events/{event_id}/formulas", response_model=list[FormulaAdminOut])
async def list_formulas(
    event_id: str, _admin: Admin = Depends(_manager), db: AsyncSession = Depends(get_db)
):
    e = await _load_event(db, event_id)
    result = await db.execute(
        select(Formula).where(Formula.event_id == e.id).order_by(Formula.sort_order.asc())
    )
    return [_to_out(f) for f in result.scalars().all()]


@router.post(
    "/events/{event_id}/formulas",
    response_model=FormulaAdminOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_formula(
    event_id: str,
    data: FormulaCreate,
    request: Request,
    admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    e = await _load_event(db, event_id)
    f = Formula(
        event_id=e.id,
        name=data.name,
        description=data.description,
        advantages=data.advantages,
        price=Decimal(str(data.price)),
        currency=data.currency,
        channel=data.channel.value,
        stock=data.stock,
        sort_order=data.sort_order,
    )
    db.add(f)
    await db.flush()
    await db.refresh(f)
    await audit_service.log(
        db, admin=admin, action="formula.create",
        resource_type="formula", resource_id=str(f.id),
        payload={"event_id": str(e.id), "name": f.name}, request=request,
    )
    return _to_out(f)


@router.patch("/formulas/{formula_id}", response_model=FormulaAdminOut)
async def update_formula(
    formula_id: str,
    data: FormulaUpdate,
    request: Request,
    admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    f = await _load_formula(db, formula_id)
    changes = data.model_dump(exclude_unset=True)
    for k, v in changes.items():
        if k == "price" and v is not None:
            f.price = Decimal(str(v))
        elif k == "channel" and v is not None:
            f.channel = v.value
        else:
            setattr(f, k, v)
    await audit_service.log(
        db, admin=admin, action="formula.update",
        resource_type="formula", resource_id=str(f.id),
        payload=changes, request=request,
    )
    return _to_out(f)


@router.delete("/formulas/{formula_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_formula(
    formula_id: str,
    request: Request,
    admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    f = await _load_formula(db, formula_id)
    # Soft delete via is_active — préserve les orders passés
    f.is_active = False
    await audit_service.log(
        db, admin=admin, action="formula.deactivate",
        resource_type="formula", resource_id=str(f.id),
        request=request,
    )


async def _load_event(db: AsyncSession, event_id: str) -> Event:
    try:
        parsed = uuid.UUID(event_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="event_id invalide")
    r = await db.execute(select(Event).where(Event.id == parsed))
    e = r.scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    return e


async def _load_formula(db: AsyncSession, formula_id: str) -> Formula:
    try:
        parsed = uuid.UUID(formula_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="formula_id invalide")
    r = await db.execute(select(Formula).where(Formula.id == parsed))
    f = r.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Formule non trouvée")
    return f
