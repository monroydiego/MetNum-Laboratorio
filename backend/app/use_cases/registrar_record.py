"""Caso de uso: récord de tiempo por matrícula (menor tiempo de misión; solo Campaña y Contrarreloj)."""
from dataclasses import dataclass

from app.domain.funciones import ErrorMetodo
from app.domain.repositories import IRecordRepo

MODOS_CON_RECORD = {"campana", "contrarreloj"}
TIEMPO_MINIMO_MS = 10_000  # descarta registros imposibles


@dataclass(frozen=True)
class ResultadoRecord:
    tiempo_ms: int
    record_ms: int
    nuevo_record: bool


class RegistrarRecord:
    def __init__(self, repo: IRecordRepo) -> None:
        self._repo = repo

    def registrar(self, matricula: str, modo: str, tiempo_ms: int, puntos: int) -> ResultadoRecord:
        matricula = matricula.strip()
        if not matricula:
            raise ErrorMetodo("Se necesita una matrícula para registrar el récord.")
        if modo not in MODOS_CON_RECORD:
            raise ErrorMetodo("Solo Campaña y Contrarreloj registran récord.")
        if tiempo_ms < TIEMPO_MINIMO_MS:
            raise ErrorMetodo("El tiempo de la misión no es válido.")
        previo = self._repo.mejor(matricula)
        self._repo.registrar(matricula, modo, tiempo_ms, puntos)
        nuevo = previo is None or tiempo_ms < previo
        return ResultadoRecord(tiempo_ms, tiempo_ms if nuevo else previo, nuevo)

    def mejor(self, matricula: str) -> int | None:
        return self._repo.mejor(matricula.strip())
