"""2FA TOTP — génération de secret, URI otpauth (pour QR code Google Authenticator), vérification."""
import pyotp

from app.core.config import settings


class TwoFactorService:
    _issuer = "FarahEvent Admin"

    def generate_secret(self) -> str:
        return pyotp.random_base32()

    def build_provisioning_uri(self, *, secret: str, account_email: str) -> str:
        """URI otpauth:// à encoder dans un QR pour Google Authenticator / Authy."""
        return pyotp.TOTP(secret).provisioning_uri(name=account_email, issuer_name=self._issuer)

    def verify(self, secret: str, code: str) -> bool:
        return pyotp.TOTP(secret).verify(code, valid_window=1)


two_factor_service = TwoFactorService()
