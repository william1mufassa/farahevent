"""Service QR — JWT signé HS256 + rendu image PNG base64.

Claims du token :
- `sub`   : ticket_id (str UUID)
- `evt`   : event_id (str UUID)
- `frm`   : formula_id (str UUID)
- `pn`    : participant_name (str, pour affichage rapide côté scanner)
- `iat`   : timestamp d'émission (int)
- `type`  : "qr_ticket" (discriminant vs access/refresh/live)

La signature HS256 rend le token infalsifiable — même sans lookup BDD, un token forgé
est rejeté. On garde tout de même la vérification `is_scanned` en base pour l'unicité.
"""
import base64
from datetime import datetime, timezone
from io import BytesIO
from typing import TypedDict

import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer
from jose import JWTError, jwt

from app.core.config import settings


TOKEN_TYPE_QR = "qr_ticket"


class QRClaims(TypedDict):
    sub: str
    evt: str
    frm: str
    pn: str
    iat: int
    type: str


class QRService:
    def encode_ticket_jwt(
        self,
        *,
        ticket_id: str,
        event_id: str,
        formula_id: str,
        participant_name: str,
    ) -> str:
        payload = {
            "sub": ticket_id,
            "evt": event_id,
            "frm": formula_id,
            "pn": participant_name,
            "iat": int(datetime.now(timezone.utc).timestamp()),
            "type": TOKEN_TYPE_QR,
        }
        # Signé avec la clé DÉDIÉE billets, pas le secret de session (audit §E.2).
        return jwt.encode(payload, settings.ticket_signing_key, algorithm=settings.ALGORITHM)

    def decode_ticket_jwt(self, token: str) -> QRClaims | None:
        """Retourne les claims si valide, None sinon."""
        try:
            payload = jwt.decode(
                token, settings.ticket_signing_key, algorithms=[settings.ALGORITHM]
            )
        except JWTError:
            return None
        if payload.get("type") != TOKEN_TYPE_QR:
            return None
        required = ("sub", "evt", "frm", "pn", "iat")
        if any(k not in payload for k in required):
            return None
        return payload  # type: ignore[return-value]

    def render_qr_image_data_url(self, content: str) -> str:
        """Rend une image PNG base64 (`data:image/png;base64,...`) — 400x400 minimum."""
        qr = qrcode.QRCode(
            version=None,  # taille auto
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=12,
            border=3,
        )
        qr.add_data(content)
        qr.make(fit=True)
        img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=RoundedModuleDrawer(),
            color_mask=qrcode.image.styles.colormasks.RadialGradiantColorMask(
                back_color=(255, 255, 255),
                center_color=(79, 70, 229), # Indigo 600
                edge_color=(17, 24, 39)    # Gray 900
            ),
        )

        buffer = BytesIO()
        img.save(buffer, format="PNG")
        return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()


qr_service = QRService()
