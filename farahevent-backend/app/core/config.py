from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

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

    # OpenWA (WhatsApp)
    OPENWA_API_URL: str = "http://localhost:3001"
    OPENWA_API_KEY: str = ""
    WHATSAPP_SENDER: str = ""

    # Brevo (email transactionnel — Sprint 6/collabo)
    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = ""
    BREVO_SENDER_NAME: str = "FarahEvent"

    # URLs applicatives
    FRONTEND_URL: str = "http://localhost:3000"
    API_URL: str = "http://localhost:8000/api/v1"
    QR_CODE_BASE_URL: str = "http://localhost:3000/verify"

    # Upload
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 5

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
