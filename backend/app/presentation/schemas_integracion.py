"""Esquemas de entrada · Unidad III · Integración. Espejo: frontend/src/types/entradas/integracion.ts

Los valores numéricos se reciben como str (se convierten con mpmath, nunca con float).
"""
from typing import Literal

from pydantic import BaseModel, Field


class IntegracionIn(BaseModel):
    """Entrada común de Regla Trapezoidal, Newton – Cotes y Reglas de Simpson."""

    funcion: str = Field(description="f(x), p. ej. 1/(1+x^2)")
    a: str = Field(description="a (límite inferior)")
    b: str = Field(description="b (límite superior)")
    n: int = Field(ge=1, le=1000, description="n (número de subintervalos / renglón de la tabla)")
    decimales: int = Field(9, ge=1, le=30)


class TablasNewtonCotesIn(BaseModel):
    tipo: Literal["cerradas", "abiertas", "ambas"] = Field("ambas", description="Tabla(s) a mostrar")
