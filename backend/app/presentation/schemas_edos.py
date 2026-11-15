"""Esquemas de entrada · Unidad IV · 6 Ecuaciones Diferenciales Ordinarias.

Espejo: frontend/src/types/entradas/edos.ts
Los valores numéricos se reciben como str (se convierten con mpmath, nunca con float).
"""
from pydantic import BaseModel, Field


class EdoIn(BaseModel):
    """Euler hacia Adelante y Runge – Kutta de 2do, 3er y 4to orden."""

    funcion: str = Field(description="y' ya despejada, en términos de y y t; p. ej. (5yt - 1)/3")
    y0: str = Field(description="y_0")
    h: str = Field(description="h (ancho de cada subintervalo)")
    t0: str = Field("0", description="t_0 (el libro: siempre es 0 pues parte del origen)")
    pasos: int = Field(1, ge=1, le=500, description="Cantidad de valores y_{n+1} a calcular")
    decimales: int = Field(9, ge=1, le=30)


class EdoArranqueIn(EdoIn):
    """Euler hacia Atrás y Euler Modificado: y_{n+1} dentro de f."""

    y_siguiente: str | None = Field(
        None, description="y_1 usado dentro de f en el primer paso; si se omite, y_1 = y_0"
    )


class EdoOrdenSuperiorIn(BaseModel):
    """Runge – Kutta de Orden Superior: y'' = f(V, U, q) con V = y', U = y, q = t."""

    funcion: str = Field(description="y'' ya despejada, en términos de V, U y q; p. ej. 2Vq - U")
    y0: str = Field(description="y_0")
    yp0: str = Field(description="y'_0")
    h: str = Field(description="h")
    q0: str = Field("0", description="q_0 = t_0")
    pasos: int = Field(1, ge=1, le=500, description="Cantidad de valores y_{n+1}, y'_{n+1} a calcular")
    decimales: int = Field(9, ge=1, le=30)
