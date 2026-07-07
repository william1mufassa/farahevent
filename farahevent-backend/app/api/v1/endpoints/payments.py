"""Stub — sera réécrit au Sprint 5 avec provider PayDunya (par le collabo)."""
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/status/{order_id}")
async def check_payment_status(order_id: str):
    raise HTTPException(status_code=501, detail="TODO Sprint 5 — PayDunya polling")
