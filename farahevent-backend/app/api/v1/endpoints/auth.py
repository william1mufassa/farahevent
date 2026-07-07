"""Auth admin — login + refresh. Support 2FA TOTP optionnel."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, Field

from app.core.database import get_db
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.admin import Admin
from app.services.two_factor_service import two_factor_service

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    otp_code: str | None = Field(None, min_length=6, max_length=6, pattern=r"^\d{6}$")


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    admin: dict


class TwoFactorRequired(BaseModel):
    detail: str = "2fa_required"


@router.post("/login", response_model=TokenResponse, responses={202: {"model": TwoFactorRequired}})
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Admin).where(Admin.email == data.email))
    admin = result.scalar_one_or_none()

    if not admin or not verify_password(data.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    if not admin.is_active:
        raise HTTPException(status_code=403, detail="Compte désactivé")

    if admin.two_factor_secret:
        if not data.otp_code:
            # Le frontend affiche l'input OTP et rappelle /login avec otp_code
            raise HTTPException(status_code=status.HTTP_202_ACCEPTED, detail="2fa_required")
        if not two_factor_service.verify(admin.two_factor_secret, data.otp_code):
            raise HTTPException(status_code=401, detail="Code 2FA incorrect")

    admin.last_login_at = datetime.now(timezone.utc)

    return _token_response(admin)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token invalide")

    result = await db.execute(select(Admin).where(Admin.id == payload.get("sub")))
    admin = result.scalar_one_or_none()
    if not admin or not admin.is_active:
        raise HTTPException(status_code=401, detail="Compte introuvable ou désactivé")
    return _token_response(admin)


def _token_response(admin: Admin) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token({"sub": str(admin.id), "role": admin.role}),
        refresh_token=create_refresh_token({"sub": str(admin.id)}),
        admin={
            "id": str(admin.id),
            "email": admin.email,
            "first_name": admin.first_name,
            "last_name": admin.last_name,
            "role": admin.role,
            "two_factor_enabled": admin.two_factor_secret is not None,
        },
    )
