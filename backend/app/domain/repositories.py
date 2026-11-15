"""Interfaces abstractas (ABC) de la CAPA 1. Implementadas en infrastructure/."""
from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.domain.entities import EvidenciaPartida


@dataclass(frozen=True)
class EvidenciaGuardada:
    id: int
    fecha_registro: str  # ISO 8601
    evidencia: EvidenciaPartida


class IEvidenciaRepo(ABC):
    @abstractmethod
    def guardar(self, evidencia: EvidenciaPartida) -> EvidenciaGuardada: ...

    @abstractmethod
    def ultimas(self, limite: int = 50, matricula: str | None = None) -> list[EvidenciaGuardada]: ...


class IFileStorage(ABC):
    @abstractmethod
    def guardar(self, contenido: bytes, extension: str) -> str:
        """Guarda el archivo con UUID y devuelve la ruta relativa (/uploads/evidencias/...)."""

    @abstractmethod
    def eliminar(self, ruta_relativa: str) -> None:
        """Borra un archivo guardado (para revertir si falla el registro en BD)."""
