"""Setup / vérification / désactivation du 2FA pour l'admin connecté."""
from fastapi import APIRouter, Depends, HTTPException, Request

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin, verify_password
from app.models.admin import Admin
from app.schemas.admin import (
    TwoFactorDisableRequest,
    TwoFactorSetupResponse,
    TwoFactorVerifyRequest,
)
from app.services.audit_service import audit_service
from app.services.two_factor_service import two_factor_service

router = APIRouter()


@router.post("/setup", response_model=TwoFactorSetupResponse)
async def setup_2fa(
    request: Request,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Génère un secret. Ne l'active PAS tant que le code n'a pas été vérifié via /verify."""
    if admin.two_factor_secret:
        raise HTTPException(status_code=409, detail="2FA déjà activé")
    secret = two_factor_service.generate_secret()
    # On stocke le secret même si non-vérifié — /verify le confirmera.
    admin.two_factor_secret = secret

    await audit_service.log(
        db, admin=admin, action="admin.2fa.setup",
        resource_type="admin", resource_id=str(admin.id), request=request,
    )
    return TwoFactorSetupResponse(
        secret=secret,
        provisioning_uri=two_factor_service.build_provisioning_uri(
            secret=secret, account_email=admin.email
        ),
    )


@router.post("/verify")
async def verify_2fa(
    data: TwoFactorVerifyRequest,
    request: Request,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if not admin.two_factor_secret:
        raise HTTPException(status_code=409, detail="2FA non configuré")
    if not two_factor_service.verify(admin.two_factor_secret, data.code):
        raise HTTPException(status_code=401, detail="Code incorrect")
    await audit_service.log(
        db, admin=admin, action="admin.2fa.enabled",
        resource_type="admin", resource_id=str(admin.id), request=request,
    )
    return {"two_factor_enabled": True}


@router.post("/disable")
async def disable_2fa(
    data: TwoFactorDisableRequest,
    request: Request,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if not admin.two_factor_secret:
        raise HTTPException(status_code=409, detail="2FA non actif")
    if not verify_password(data.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    if not two_factor_service.verify(admin.two_factor_secret, data.code):
        raise HTTPException(status_code=401, detail="Code incorrect")
    admin.two_factor_secret = None
    await audit_service.log(
        db, admin=admin, action="admin.2fa.disabled",
        resource_type="admin", resource_id=str(admin.id), request=request,
    )
    return {"two_factor_enabled": False}
