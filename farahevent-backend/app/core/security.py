from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.models.admin import Admin
from app.models.enums import AdminRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")


def create_ws_ticket(admin_id: str, role: str) -> str:
    """Ticket court-terme d'ouverture du WebSocket admin.

    Le JWT de session vit en cookie httpOnly, non transmis au handshake WS
    (cross-origin). Le front échange ce ticket via le BFF authentifié puis le
    passe en query param. `type` distinct de "access" : un ticket ne peut pas
    servir de jeton de session (ni l'inverse) — cf. get_current_admin.
    """
    expire = datetime.now(timezone.utc) + timedelta(seconds=settings.WS_TICKET_EXPIRE_SECONDS)
    to_encode = {"sub": admin_id, "role": role, "exp": expire, "type": "ws_ticket"}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_live_token(participant_id: str, event_id: str) -> str:
    """Jeton d'accès au Live pour un participant."""
    expire = datetime.now(timezone.utc) + timedelta(hours=12) # 12 hours for live duration
    to_encode = {"sub": participant_id, "event_id": event_id, "exp": expire, "type": "live_access"}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_live_token(token: str) -> Optional[dict]:
    """Décode le jeton d'accès au Live."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
    if payload.get("type") != "live_access":
        return None
    return payload


def decode_ws_ticket(token: str) -> Optional[dict]:
    """Décode/valide un ticket WS. Retourne le payload, ou None si invalide
    (signature, expiration, type incorrect). Conçu pour le handshake WS où l'on
    ferme la socket au lieu de lever une HTTPException."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
    if payload.get("type") != "ws_ticket":
        return None
    return payload


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> Admin:
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Token invalide")

    admin_id = payload.get("sub")
    if not admin_id:
        raise HTTPException(status_code=401, detail="Token invalide")

    result = await db.execute(select(Admin).where(Admin.id == uuid.UUID(admin_id)))
    admin = result.scalar_one_or_none()
    if not admin or not admin.is_active:
        raise HTTPException(status_code=401, detail="Compte introuvable ou désactivé")

    return admin


def require_roles(*allowed: AdminRole):
    """Dépendance FastAPI : vérifie que l'admin a l'un des rôles requis."""
    allowed_values = {r.value for r in allowed}

    async def _dep(admin: Admin = Depends(get_current_admin)) -> Admin:
        if admin.role not in allowed_values:
            raise HTTPException(
                status_code=403, detail=f"Rôle requis : {', '.join(sorted(allowed_values))}"
            )
        return admin

    return _dep
