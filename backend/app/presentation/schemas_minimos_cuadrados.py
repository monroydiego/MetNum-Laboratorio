"""Esquemas de entrada · Unidad II · 4 Mínimos Cuadrados. Espejo: frontend/src/types/entradas/minimos_cuadrados.ts

Los valores numéricos se reciben como str (se convierten con mpmath, nunca con float).
"""
from pydantic import BaseModel, Field


class MinimosCuadradosIn(BaseModel):
    """Línea Recta, Cuadrática y Cúbica."""

    x: list[str] = Field(min_length=1, description="Valores dados a x")
    y: list[str] = Field(min_length=1, description="Valores de y")
    decimales: int = Field(9, ge=1, le=30)


class MinimosCuadradosConFuncionIn(MinimosCuadradosIn):
    """Lineal con Función y Cuadrática con Función."""

    funcion: str = Field(description="función(x): e^x, sen(x), cos(x), tg(x), Ln(x), etc.")
