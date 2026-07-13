"""Upsert payment_config par événement."""
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles
from app.models.admin import Admin
from app.models.enums import AdminRole
from app.models.payment_config import PaymentConfig
from app.schemas.event_admin import PaymentConfigUpsert
from app.services.audit_service import audit_service
from app.services.revalidate_service import revalidate_service

router = APIRouter()
_manager = require_roles(AdminRole.SUPER_ADMIN, AdminRole.MANAGER)


def _to_out(cfg: PaymentConfig) -> dict:
    return {
        "event_id": str(cfg.event_id),
        "beneficiary_name": cfg.beneficiary_name,
        "beneficiary_country": cfg.beneficiary_country,
        "beneficiary_city": cfg.beneficiary_city,
        "amount_fcfa": float(cfg.amount_fcfa) if cfg.amount_fcfa is not None else None,
        "amount_eur": float(cfg.amount_eur) if cfg.amount_eur is not None else None,
        "amount_usd": float(cfg.amount_usd) if cfg.amount_usd is not None else None,
        "instructions_text": cfg.instructions_text,
        "is_digital_enabled": cfg.is_digital_enabled,
        "is_manual_enabled": cfg.is_manual_enabled,
    }


@router.get("/events/{event_id}/payment-config")
async def get_config(
    event_id: str, _admin: Admin = Depends(_manager), db: AsyncSession = Depends(get_db)
):
    parsed = _uuid(event_id)
    result = await db.execute(select(PaymentConfig).where(PaymentConfig.event_id == parsed))
    cfg = result.scalar_one_or_none()
    if not cfg:
        # Retourne un état par défaut sans créer en BDD
        return {
            "event_id": str(parsed),
            "beneficiary_name": None,
            "beneficiary_country": None,
            "beneficiary_city": None,
            "amount_fcfa": None,
            "amount_eur": None,
            "amount_usd": None,
            "instructions_text": None,
            "is_digital_enabled": True,
            "is_manual_enabled": False,
        }
    return _to_out(cfg)


@router.put("/events/{event_id}/payment-config")
async def upsert_config(
    event_id: str,
    data: PaymentConfigUpsert,
    request: Request,
    admin: Admin = Depends(_manager),
    db: AsyncSession = Depends(get_db),
):
    parsed = _uuid(event_id)
    result = await db.execute(select(PaymentConfig).where(PaymentConfig.event_id == parsed))
    cfg = result.scalar_one_or_none()
    if not cfg:
        cfg = PaymentConfig(event_id=parsed)
        db.add(cfg)

    changes = data.model_dump(exclude_unset=True)
    for k, v in changes.items():
        if k in ("amount_fcfa", "amount_eur", "amount_usd") and v is not None:
            setattr(cfg, k, Decimal(str(v)))
        else:
            setattr(cfg, k, v)

    await db.flush()
    await audit_service.log(
        db, admin=admin, action="payment_config.upsert",
        resource_type="payment_config", resource_id=str(parsed),
        payload=changes, request=request,
    )
    # Les modes de paiement pilotent la page d'achat publique → invalide l'ISR.
    await revalidate_service.revalidate_event_by_id(db, parsed)
    return _to_out(cfg)


def _uuid(v: str) -> uuid.UUID:
    try:
        return uuid.UUID(v)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="event_id invalide")
