"""Récord de tiempo: POST /api/records (al ganar) y GET /api/records/{matricula} (público, solo el tiempo)."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.infrastructure.sqlite_repo import SQLiteRecordRepo
from app.presentation.schemas import ErrorOut
from app.use_cases.registrar_record import RegistrarRecord

router = APIRouter(prefix="/api/records", tags=["récord"])


def obtener_registrar_record() -> RegistrarRecord:
    return RegistrarRecord(SQLiteRecordRepo())


class RecordIn(BaseModel):
    matricula: str = Field(max_length=20)
    modo: str = Field(max_length=20)
    tiempo_ms: int = Field(ge=0, le=10**10)
    puntos: int = Field(ge=0, le=10**7)


class RecordOut(BaseModel):
    tiempo_ms: int
    record_ms: int
    nuevo_record: bool


class MejorOut(BaseModel):
    record_ms: int | None


@router.post("", response_model=RecordOut, responses={422: {"model": ErrorOut}})
def registrar(datos: RecordIn, caso: RegistrarRecord = Depends(obtener_registrar_record)) -> RecordOut:
    return RecordOut(**vars(caso.registrar(datos.matricula, datos.modo, datos.tiempo_ms, datos.puntos)))


@router.get("/{matricula}", response_model=MejorOut)
def mejor(matricula: str, caso: RegistrarRecord = Depends(obtener_registrar_record)) -> MejorOut:
    return MejorOut(record_ms=caso.mejor(matricula))
