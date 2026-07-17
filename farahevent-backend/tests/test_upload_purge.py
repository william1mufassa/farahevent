"""Purge des reçus orphelins — borne réelle de la croissance disque.

`save_receipt` écrit un fichier au nom UUID neuf à chaque appel. Quand un acheteur
re-soumet sa preuve, la ligne en base est écrasée : sans purge, l'ancien fichier
restait à jamais sur disque, référencé par personne. Sur un endpoint PUBLIC, c'est
une croissance non bornée — le rate limit ne fait que la ralentir.
"""
import io
from pathlib import Path

import pytest
from fastapi import HTTPException, UploadFile

from app.services.upload_service import UploadService

_PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def _upload(name="r.png", content=_PNG, content_type="image/png"):
    return UploadFile(
        filename=name,
        file=io.BytesIO(content),
        headers={"content-type": content_type},
    )


@pytest.fixture
def svc(tmp_path):
    return UploadService(base_dir=str(tmp_path))


async def test_delete_removes_the_file(svc, tmp_path):
    key = await svc.save_receipt(_upload())
    assert (tmp_path / key).is_file()

    assert await svc.delete_receipt(key) is True
    assert not (tmp_path / key).exists()


async def test_resubmission_leaves_no_orphan(svc, tmp_path):
    """Le scénario réel : l'acheteur renvoie une meilleure photo."""
    old = await svc.save_receipt(_upload())
    new = await svc.save_receipt(_upload())
    assert old != new  # nom UUID neuf à chaque fois

    await svc.delete_receipt(old)

    remaining = list(tmp_path.rglob("*.png"))
    assert len(remaining) == 1, "un fichier orphelin est resté sur disque"
    assert remaining[0].name == Path(new).name


async def test_delete_is_idempotent(svc):
    key = await svc.save_receipt(_upload())
    assert await svc.delete_receipt(key) is True
    # Deuxième passage : plus de fichier, mais on ne lève pas — échouer à purger
    # ne doit jamais casser la soumission d'un acheteur qui a payé.
    assert await svc.delete_receipt(key) is False


async def test_delete_ignores_empty_key(svc):
    assert await svc.delete_receipt(None) is False
    assert await svc.delete_receipt("") is False


@pytest.mark.parametrize(
    "evil",
    [
        "../../../../etc/passwd",
        "receipts/../../../secret.txt",
        "/etc/passwd",
        "..\\..\\windows\\system32\\config\\sam",
    ],
)
async def test_delete_refuses_paths_outside_upload_dir(svc, evil):
    """La clé vient de la base, mais un unlink() hors périmètre est autrement plus
    grave qu'un read() : même garde que la route de lecture.

    ⚠ Ces cas sont FAIBLES à eux seuls : la cible n'existe pas, donc `is_file()`
    suffirait à les refuser même sans garde de périmètre. Le vrai test est
    `test_delete_refuses_reachable_file_outside_base` ci-dessous, qui vise un
    fichier RÉEL atteignable par traversée.
    """
    assert await svc.delete_receipt(evil) is False


async def test_delete_refuses_reachable_file_outside_base(tmp_path):
    """Le seul cas qui prouve le garde : un fichier qui EXISTE et qu'une traversée
    depuis UPLOAD_DIR atteint réellement. Sans `is_relative_to`, il serait supprimé.
    """
    base = tmp_path / "uploads"
    base.mkdir()
    victim = tmp_path / "ne_pas_supprimer.txt"
    victim.write_text("intact")

    svc = UploadService(base_dir=str(base))
    # base/../ne_pas_supprimer.txt -> résout vers un fichier réel, hors périmètre.
    assert await svc.delete_receipt("../ne_pas_supprimer.txt") is False

    assert victim.is_file(), "un fichier hors UPLOAD_DIR a été supprimé"
    assert victim.read_text() == "intact"
