"""Modelos Pydantic comunes (salida JSON). Espejo en frontend/src/types/numericos.ts.

Los esquemas de ENTRADA de cada módulo viven en `schemas_<modulo>.py` (espejo en
frontend/src/types/entradas/<modulo>.ts). Valores de precisión: str. Gráfica y errores: float.
"""
from typing import Any, Literal

from pydantic import BaseModel, Field


class ColumnaOut(BaseModel):
    clave: str
    latex: str


class PasoOut(BaseModel):
    descripcion: str
    latex: str


class MatrizOut(BaseModel):
    titulo: str
    filas: list[list[str]]
    pivote: tuple[int, int] | None
    nota: str | None


class SerieOut(BaseModel):
    nombre: str
    tipo: Literal["linea", "puntos"]
    puntos: list[tuple[float, float]]


class ResultadoOut(BaseModel):
    metodo: str
    nombre_libro: str
    pagina: int
    columnas: list[ColumnaOut]
    filas: list[dict[str, str | None]]
    pasos: list[PasoOut]
    matrices: list[MatrizOut]
    resultado: dict[str, str]
    errores: list[float]
    series: list[SerieOut]
    advertencias: list[str]


class MetodoInfoOut(BaseModel):
    slug: str
    nombre_libro: str
    pagina: int
    unidad: int
    capitulo: str
    esquema_entrada: dict[str, Any] = Field(description="JSON Schema del cuerpo de la petición")
    ejemplo: dict[str, Any] = Field(description="Datos del ejemplo resuelto del libro")


class ErrorOut(BaseModel):
    detail: str


class EvidenciaOut(BaseModel):
    id: int
    matricula: str
    nivel: int
    metodo: str
    funcion: str
    resultado_exacto: str
    error: float | None
    iteraciones_json: list[dict[str, str | None]]
    foto_procedimiento_url: str
    foto_canvas_url: str
    fecha_registro: str
