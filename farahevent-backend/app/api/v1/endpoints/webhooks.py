"""Stub — sera réécrit au Sprint 5 (webhook PayDunya avec vérif signature)."""
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.post("/paydunya")
async def paydunya_webhook():
    raise HTTPException(status_code=501, detail="TODO Sprint 5 — PayDunya webhook + HMAC verify")
