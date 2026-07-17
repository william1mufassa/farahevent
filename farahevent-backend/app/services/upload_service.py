"""Service d'upload sécurisé — utilisé pour les preuves de paiement manuel.

Validations :
- MIME type : image/jpeg ou image/png uniquement
- Taille max : settings.MAX_UPLOAD_SIZE_MB
- Nom de fichier hashé (uuid) — pas de traversée de chemin possible
- Stockage dans <UPLOAD_DIR>/receipts/<YYYY>/<MM>/<uuid>.<ext>
"""
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

import anyio
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

logger = logging.getLogger(__name__)


ALLOWED_MIME = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
}

# Magic bytes de sécurité (double-check du MIME auto-annoncé par le navigateur)
_MAGIC_JPEG = b"\xff\xd8\xff"
_MAGIC_PNG = b"\x89PNG\r\n\x1a\n"


class UploadService:
    def __init__(self, base_dir: str | None = None):
        self.base_dir = Path(base_dir or settings.UPLOAD_DIR)

    async def save_receipt(self, upload: UploadFile) -> str:
        """Enregistre une preuve de paiement manuel. Retourne la clé de stockage
        relative (sous UPLOAD_DIR) — jamais une URL publique (audit §C.2)."""
        if upload.content_type not in ALLOWED_MIME:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Type de fichier non supporté : {upload.content_type}. Autorisés : JPEG, PNG.",
            )

        # Lecture streamée + validation taille
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        content = await upload.read(max_bytes + 1)
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Fichier trop lourd (max {settings.MAX_UPLOAD_SIZE_MB} Mo).",
            )
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Fichier vide.")

        # Magic bytes check
        if not (content.startswith(_MAGIC_JPEG) or content.startswith(_MAGIC_PNG)):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Contenu du fichier ne correspond pas à une image JPEG/PNG valide.",
            )

        ext = ALLOWED_MIME[upload.content_type]
        now = datetime.now(timezone.utc)
        rel_dir = Path("receipts") / f"{now.year:04d}" / f"{now.month:02d}"
        target_dir = self.base_dir / rel_dir
        target_dir.mkdir(parents=True, exist_ok=True)

        filename = f"{uuid.uuid4().hex}.{ext}"
        target_path = target_dir / filename

        await anyio.to_thread.run_sync(lambda: target_path.write_bytes(content))

        # Clé de stockage RELATIVE à UPLOAD_DIR (et non une URL publique) : les reçus
        # contiennent des données financières et ne sont servis que via la route admin
        # authentifiée GET /admin/manual-payments/{id}/receipt (audit §C.2).
        return f"{rel_dir.as_posix()}/{filename}"  # ex: receipts/2026/07/<uuid>.jpg

    async def delete_receipt(self, storage_key: str | None) -> bool:
        """Supprime un reçu devenu orphelin. Retourne True si un fichier a été retiré.

        Chaque `save_receipt` écrit un fichier au nom UUID neuf. Quand un acheteur
        re-soumet sa preuve, la ligne en base est écrasée mais l'ancien fichier
        restait sur disque À JAMAIS — personne ne le référençait plus, rien ne le
        purgeait. Sur un endpoint public, c'est une croissance disque non bornée.

        Ne lève jamais : échouer à supprimer un vieux fichier ne doit pas faire
        échouer la soumission d'un acheteur qui, lui, a payé.
        """
        if not storage_key:
            return False

        base = Path(self.base_dir).resolve()
        key = storage_key.lstrip("/")
        if key.startswith("uploads/"):  # tolère d'anciennes valeurs préfixées
            key = key[len("uploads/") :]
        target = (base / key).resolve()

        # Même garde que la route de lecture : la clé vient de la base, mais on ne
        # laisse jamais un chemin sortir d'UPLOAD_DIR — un unlink() hors périmètre
        # est autrement plus grave qu'un read().
        if not target.is_relative_to(base) or not target.is_file():
            return False

        try:
            await anyio.to_thread.run_sync(target.unlink)
            return True
        except OSError:
            logger.warning("Purge du reçu %s impossible", storage_key, exc_info=True)
            return False


upload_service = UploadService()
