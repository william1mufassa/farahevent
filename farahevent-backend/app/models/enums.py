"""Enums métier — valeurs autorisées pour les colonnes de type String."""

from enum import Enum


class AdminRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    MANAGER = "manager"
    AGENT = "agent"
    COMPTABLE = "comptable"


class EventMode(str, Enum):
    PRESENTIEL = "presentiel"
    ONLINE = "online"
    HYBRID = "hybrid"


class EventStatus(str, Enum):
    DRAFT = "draft"
    OPEN = "open"
    LIVE = "live"
    CLOSED = "closed"


class EventTemplate(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"



class FormulaChannel(str, Enum):
    PRESENTIEL = "presentiel"
    ONLINE = "online"
    BOTH = "both"


class OrderStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    MANUAL_PENDING = "MANUAL_PENDING"
    MANUAL_VALIDATED = "MANUAL_VALIDATED"
    REJECTED = "REJECTED"
    REFUNDED = "REFUNDED"


class PaymentProvider(str, Enum):
    PAYDUNYA = "paydunya"
    MANUAL = "manual"


class ManualPaymentOperator(str, Enum):
    WESTERN_UNION = "western_union"
    RIA = "ria"
    MONEYGRAM = "moneygram"
    OTHER = "other"


class ManualPaymentStatus(str, Enum):
    PENDING = "pending"
    VALIDATED = "validated"
    REJECTED = "rejected"


class TicketType(str, Enum):
    QR = "qr"
    LIVE_LINK = "live_link"


class TicketDeliveryPref(str, Enum):
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    BOTH = "both"


class ScanResult(str, Enum):
    VALID = "valid"
    INVALID = "invalid"
    DUPLICATE = "duplicate"


class EmailTrigger(str, Enum):
    PAYMENT_CONFIRMED = "payment_confirmed"
    MANUAL_VALIDATED = "manual_validated"
    MANUAL_REJECTED = "manual_rejected"
    J_MINUS_7 = "j_minus_7"
    J_MINUS_3 = "j_minus_3"
    J_MINUS_1 = "j_minus_1"
    H_MINUS_2 = "h_minus_2"
    H_MINUS_0_5 = "h_minus_0_5"
    J_PLUS_1 = "j_plus_1"
    J_PLUS_7 = "j_plus_7"


class AutomationChannel(str, Enum):
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    BOTH = "both"


class WhatsappGroupCategory(str, Enum):
    PRESENTIEL = "presentiel"
    ONLINE = "online"
