"""Interfaces abstractas (ABC) de la CAPA 1. Implementadas en infrastructure/."""
from abc import ABC, abstractmethod
from dataclasses import dataclass

from datetime import datetime

from app.domain.entities import Docente, EvidenciaPartida


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

    @abstractmethod
    def resumen_por_matricula(self) -> list["ResumenMatricula"]: ...


@dataclass(frozen=True)
class ResumenMatricula:
    matricula: str
    intentos: int
    correctos: int
    incorrectos: int
    ultima_fecha: str  # ISO 8601
    record_ms: int | None = None  # mejor tiempo de misión (None si nunca ganó)


class IRecordRepo(ABC):
    @abstractmethod
    def mejor(self, matricula: str) -> int | None:
        """Menor tiempo (ms) registrado por la matrícula, o None."""

    @abstractmethod
    def registrar(self, matricula: str, modo: str, tiempo_ms: int, puntos: int) -> None: ...


class IDocenteRepo(ABC):
    @abstractmethod
    def por_correo(self, correo: str) -> tuple[Docente, str] | None:
        """Devuelve (docente, hash de su clave) o None."""

    @abstractmethod
    def guardar_sesion(self, token_hash: str, docente_id: int, expira: datetime) -> None: ...

    @abstractmethod
    def docente_de_sesion(self, token_hash: str, ahora: datetime) -> Docente | None: ...

    @abstractmethod
    def cerrar_sesion(self, token_hash: str) -> None: ...


class IFileStorage(ABC):
    @abstractmethod
    def guardar(self, contenido: bytes, extension: str) -> str:
        """Guarda el archivo con UUID y devuelve la ruta relativa (/uploads/evidencias/...)."""

    @abstractmethod
    def eliminar(self, ruta_relativa: str) -> None:
        """Borra un archivo guardado (para revertir si falla el registro en BD)."""
