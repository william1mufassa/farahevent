"""CRUD FAQ chatbot par événement."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles
from app.models.admin import Admin
from app.models.chatbot_faq import ChatbotFaq
from app.models.enums import AdminRole
from app.schemas.event_admin import ChatbotFaqCreate, ChatbotFaqOut, ChatbotFaqUpdate
from app.services.audit_service import audit_service

router = APIRouter()
_manager = require_roles(AdminRole.SUPER_ADMIN, AdminRole.MANAGER)


def _to_out(f: ChatbotFaq) -> ChatbotFaqOut:
    return ChatbotFaqOut(
        id=str(f.id), event_id=str(f.event_id),
        question=f.question, answer=f.answer,
        sort_order=f.sort_order, is_active=f.is_active,
    )


@router.get("/events/{event_id}/faqs", response_model=list[ChatbotFaqOut])
async def list_faqs(
    event_id: str, _admin: Admin = Depends(_manager), db: AsyncSession = Depends(get_db)
):
    parsed = _uuid(event_id)
    r = await db.execute(
        select(ChatbotFaq).where(ChatbotFaq.event_id == parsed).order_by(ChatbotFaq.sort_order)
    )
    return [_to_out(f) for f in r.scalars().all()]


@router.post(
    "/events/{event_id}/faqs", response_model=ChatbotFaqOut, status_code=status.HTTP_201_CREATED
)
async def create_faq(
    event_id: str, data: ChatbotFaqCreate, request: Request,
    admin: Admin = Depends(_manager), db: AsyncSession = Depends(get_db),
):
    parsed = _uuid(event_id)
    f = ChatbotFaq(
        event_id=parsed, question=data.question, answer=data.answer, sort_order=data.sort_order
    )
    db.add(f)
    await db.flush()
    await db.refresh(f)
    await audit_service.log(
        db, admin=admin, action="chatbot_faq.create",
        resource_type="chatbot_faq", resource_id=str(f.id),
        payload={"event_id": str(parsed)}, request=request,
    )
    return _to_out(f)


@router.patch("/faqs/{faq_id}", response_model=ChatbotFaqOut)
async def update_faq(
    faq_id: str, data: ChatbotFaqUpdate, request: Request,
    admin: Admin = Depends(_manager), db: AsyncSession = Depends(get_db),
):
    f = await _load(db, faq_id)
    changes = data.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(f, k, v)
    await audit_service.log(
        db, admin=admin, action="chatbot_faq.update",
        resource_type="chatbot_faq", resource_id=str(f.id),
        payload=changes, request=request,
    )
    return _to_out(f)


@router.delete("/faqs/{faq_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_faq(
    faq_id: str, request: Request,
    admin: Admin = Depends(_manager), db: AsyncSession = Depends(get_db),
):
    f = await _load(db, faq_id)
    await db.delete(f)
    await audit_service.log(
        db, admin=admin, action="chatbot_faq.delete",
        resource_type="chatbot_faq", resource_id=str(f.id), request=request,
    )


async def _load(db: AsyncSession, faq_id: str) -> ChatbotFaq:
    parsed = _uuid(faq_id)
    r = await db.execute(select(ChatbotFaq).where(ChatbotFaq.id == parsed))
    f = r.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="FAQ non trouvée")
    return f


def _uuid(v: str) -> uuid.UUID:
    try:
        return uuid.UUID(v)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="ID invalide")
