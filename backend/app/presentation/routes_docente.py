"""Modo Comprobación Docente: POST /api/evidencias (multipart) y GET /api/evidencias."""
import json
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile

from app.domain.funciones import ErrorMetodo
from app.domain.repositories import EvidenciaGuardada
from app.infrastructure.local_storage import LocalFileStorage
from app.infrastructure.sqlite_repo import SQLiteEvidenciaRepo
from app.presentation.schemas import ErrorOut, EvidenciaOut
from app.use_cases.gestionar_evidencia import GestionarEvidencia, ImagenSubida

router = APIRouter(prefix="/api/evidencias", tags=["modo comprobación"])


def obtener_caso_uso() -> GestionarEvidencia:
    return GestionarEvidencia(SQLiteEvidenciaRepo(), LocalFileStorage())


def _a_salida(g: EvidenciaGuardada) -> EvidenciaOut:
    e = g.evidencia
    return EvidenciaOut(
        id=g.id,
        matricula=e.matricula,
        nivel=e.nivel,
        metodo=e.metodo,
        funcion=e.funcion,
        resultado_exacto=e.resultado_exacto,
        error=e.error,
        iteraciones_json=e.iteraciones,
        foto_procedimiento_url=e.foto_procedimiento_url,
        foto_canvas_url=e.foto_canvas_url,
        fecha_registro=g.fecha_registro,
    )


async def _imagen(archivo: UploadFile) -> ImagenSubida:
    return ImagenSubida(contenido=await archivo.read(), tipo_mime=archivo.content_type or "")


@router.post("", response_model=EvidenciaOut, responses={422: {"model": ErrorOut}})
async def enviar_evidencia(
    matricula: Annotated[str, Form(max_length=20)],
    nivel: Annotated[int, Form(ge=0)],
    metodo: Annotated[str, Form(max_length=60)],
    funcion: Annotated[str, Form(max_length=255)],
    resultado_exacto: Annotated[str, Form(max_length=500)],
    iteraciones_json: Annotated[str, Form()],
    foto_procedimiento: Annotated[UploadFile, File()],
    foto_canvas: Annotated[UploadFile, File()],
    caso_uso: Annotated[GestionarEvidencia, Depends(obtener_caso_uso)],
    error: Annotated[str, Form()] = "",
) -> EvidenciaOut:
    try:
        filas = json.loads(iteraciones_json or "[]")
        if not isinstance(filas, list):
            raise ValueError
        valor_error = float(error) if error.strip() else None
    except ValueError as exc:
        raise ErrorMetodo("iteraciones_json debe ser una lista JSON y error un número o vacío.") from exc

    guardada = caso_uso.registrar(
        matricula=matricula,
        nivel=nivel,
        metodo=metodo,
        funcion=funcion,
        resultado_exacto=resultado_exacto,
        error=valor_error,
        iteraciones=filas,
        foto_procedimiento=await _imagen(foto_procedimiento),
        foto_canvas=await _imagen(foto_canvas),
    )
    return _a_salida(guardada)


@router.get("", response_model=list[EvidenciaOut])
def listar_evidencias(
    limite: Annotated[int, Query(ge=1, le=200)] = 50,
    matricula: str | None = None,
    caso_uso: GestionarEvidencia = Depends(obtener_caso_uso),
) -> list[EvidenciaOut]:
    return [_a_salida(g) for g in caso_uso.listar(limite, matricula)]
