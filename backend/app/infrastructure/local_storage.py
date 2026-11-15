"""Implementación de IFileStorage en disco: backend/uploads/evidencias/<uuid>.<ext>."""
import uuid
from pathlib import Path

from app.domain.repositories import IFileStorage
from app.infrastructure.database import UPLOADS_DIR


class LocalFileStorage(IFileStorage):
    def __init__(self, raiz: Path = UPLOADS_DIR, carpeta: str = "evidencias") -> None:
        self._raiz = raiz
        self._carpeta = carpeta
        (raiz / carpeta).mkdir(parents=True, exist_ok=True)

    def guardar(self, contenido: bytes, extension: str) -> str:
        nombre = f"{uuid.uuid4().hex}.{extension.lstrip('.').lower()}"
        (self._raiz / self._carpeta / nombre).write_bytes(contenido)
        return f"/uploads/{self._carpeta}/{nombre}"

    def eliminar(self, ruta_relativa: str) -> None:
        nombre = Path(ruta_relativa).name
        destino = self._raiz / self._carpeta / nombre
        if destino.is_file():
            destino.unlink()
