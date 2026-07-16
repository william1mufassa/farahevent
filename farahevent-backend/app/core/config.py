from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import List


class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-this-secret-key-in-production"
    # Clé DÉDIÉE à la signature des billets (QR + live), distincte de SECRET_KEY :
    # une rotation du secret de session n'invalide pas les billets déjà émis, et
    # une fuite de l'un ne compromet pas l'autre (audit §E.2). Vide => retombe
    # sur SECRET_KEY (dev). En prod : obligatoire et distincte.
    TICKET_SIGNING_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    # Ticket WS (court-terme) : le JWT de session est en cookie httpOnly, non
    # transmis au handshake WebSocket cross-origin. Le front récupère ce ticket
    # via le BFF authentifié puis le passe en query param à la connexion. TTL
    # court = fenêtre de rejeu réduite (le ticket transite en clair dans l'URL).
    WS_TICKET_EXPIRE_SECONDS: int = 60

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://farahevent_user:password@localhost:5432/farahevent"
    # URL synchrone (psycopg2) pour Alembic
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://farahevent_user:password@localhost:5432/farahevent"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://farahevent.tech",
        "https://www.farahevent.tech",
    ]

    # PayDunya (Sprint 5 — le collabo branche)
    PAYDUNYA_MASTER_KEY: str = ""
    PAYDUNYA_PRIVATE_KEY: str = ""
    PAYDUNYA_PUBLIC_KEY: str = ""
    PAYDUNYA_TOKEN: str = ""
    PAYDUNYA_MODE: str = "test"  # test / live
    PAYDUNYA_API_URL: str = "https://app.paydunya.com/api/v1"

    # GeniusPay (Digital payments)
    GENIUSPAY_API_KEY: str = ""
    GENIUSPAY_SECRET_KEY: str = ""
    GENIUSPAY_API_URL: str = "https://geniuspay.ci/api/v1/merchant"
    GENIUSPAY_WEBHOOK_URL: str = ""
    GENIUSPAY_MODE: str = "test"

    # OpenWA (WhatsApp)
    OPENWA_API_URL: str = "https://wa.farahevent.tech"
    OPENWA_API_KEY: str = ""
    WHATSAPP_SENDER: str = ""

    # Email
    RESEND_API_KEY: str = ""

    # Cloudflare Turnstile (anti-bot du tunnel d'achat) — vide = vérif désactivée (dev)
    TURNSTILE_SECRET_KEY: str = ""

    # Brevo (email transactionnel — Sprint 6/collabo)
    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = ""
    BREVO_SENDER_NAME: str = "FarahEvent"

    # URLs applicatives
    FRONTEND_URL: str = "http://localhost:3000"
    # URL interne du frontend pour les appels serveur→serveur (revalidation ISR).
    # En dev Docker : http://host.docker.internal:3000 (le front tourne sur l'hôte).
    # Vide => retombe sur FRONTEND_URL.
    FRONTEND_INTERNAL_URL: str = ""
    # Secret partagé avec le frontend (POST /api/revalidate) — doit matcher REVALIDATE_SECRET du front.
    REVALIDATE_SECRET: str = ""
    API_URL: str = "http://localhost:8000/api/v1"
    QR_CODE_BASE_URL: str = "http://localhost:3000/verify"

    # Upload
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 5

    @property
    def ticket_signing_key(self) -> str:
        """Clé effective de signature des billets : TICKET_SIGNING_KEY si posée,
        sinon SECRET_KEY (dev / rétrocompat)."""
        return self.TICKET_SIGNING_KEY or self.SECRET_KEY

    @property
    def frontend_internal_url(self) -> str:
        """URL du frontend pour les appels serveur→serveur (revalidation ISR)."""
        return self.FRONTEND_INTERNAL_URL or self.FRONTEND_URL

    @model_validator(mode="after")
    def _fail_fast_in_production(self):
        """Refuse de démarrer en prod avec une config non sûre (audit §C.5).

        Un déploiement prod sans .env correct planterait au boot au lieu de
        tourner silencieusement avec un SECRET_KEY par défaut (forge de JWT
        admin ET de billets) ou DEBUG=True (fuite SQL/traces).
        """
        if self.APP_ENV != "production":
            return self
        problems: list[str] = []
        if (
            self.SECRET_KEY in ("", "change-this-secret-key-in-production")
            or len(self.SECRET_KEY) < 32
        ):
            problems.append("SECRET_KEY doit être une valeur aléatoire d'au moins 32 caractères")
        if self.DEBUG:
            problems.append("DEBUG doit être False en production (fuite SQL/traces sinon)")
        if ":password@" in self.DATABASE_URL:
            problems.append("DATABASE_URL utilise encore le mot de passe par défaut 'password'")
        if not self.TICKET_SIGNING_KEY or len(self.TICKET_SIGNING_KEY) < 32:
            problems.append("TICKET_SIGNING_KEY doit être défini (≥32 caractères)")
        elif self.TICKET_SIGNING_KEY == self.SECRET_KEY:
            problems.append("TICKET_SIGNING_KEY doit être DIFFÉRENT de SECRET_KEY")
        if problems:
            raise ValueError(
                "Configuration de production invalide :\n  - " + "\n  - ".join(problems)
            )
        return self

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
