"""Fabriques de données pour les tests — créent des lignes minimalistes valides."""
import uuid
from datetime import datetime, timezone

from app.core.security import hash_password
from app.models.admin import Admin
from app.models.event import Event
from app.models.formula import Formula
from app.models.manual_payment import ManualPayment
from app.models.order import Order
from app.models.participant import Participant
from app.models.payment_config import PaymentConfig


async def make_admin(db, role="super_admin", email=None):
    a = Admin(
        email=email or f"{role}-{uuid.uuid4().hex[:6]}@test.io",
        password_hash=hash_password("x"),
        first_name="T",
        last_name="Admin",
        role=role,
        is_active=True,
    )
    db.add(a)
    await db.flush()
    return a


async def make_event(db, status="open", mode="presentiel"):
    e = Event(
        slug="ev-" + uuid.uuid4().hex[:8],
        name="Ev",
        mode=mode,
        status=status,
        template="A",
        date=datetime.now(timezone.utc),
    )
    db.add(e)
    await db.flush()
    return e


async def make_formula(db, event, stock=None, channel="presentiel", price=1000):
    f = Formula(
        event_id=event.id,
        name="Std",
        price=price,
        currency="XOF",
        channel=channel,
        stock=stock,
        sold_quantity=0,
        is_active=True,
    )
    db.add(f)
    await db.flush()
    return f


async def make_participant(db, email=None):
    p = Participant(
        first_name="A",
        last_name="B",
        email=email or f"{uuid.uuid4().hex[:6]}@t.io",
        whatsapp="+2250700000000",
        country="CI",
        ticket_delivery_pref="both",
    )
    db.add(p)
    await db.flush()
    return p


async def make_order(
    db, event, formula, participant, status="PENDING",
    provider=None, checkout_id=None, created_at=None, metadata=None,
):
    o = Order(
        event_id=event.id,
        formula_id=formula.id,
        participant_id=participant.id,
        amount=formula.price,
        currency="XOF",
        status=status,
        payment_provider=provider,
        payment_provider_checkout_id=checkout_id,
        metadata_=metadata,
    )
    if created_at:
        o.created_at = created_at
    db.add(o)
    await db.flush()
    return o


async def make_payment_config(db, event, digital=True, manual=True):
    cfg = PaymentConfig(
        event_id=event.id, is_digital_enabled=digital, is_manual_enabled=manual
    )
    db.add(cfg)
    await db.flush()
    return cfg


async def make_manual_payment(db, order, status="pending"):
    mp = ManualPayment(
        order_id=order.id,
        operator="western_union",
        sender_name="X",
        sender_country="FR",
        receipt_image_url="receipts/x.jpg",
        status=status,
    )
    db.add(mp)
    await db.flush()
    return mp
