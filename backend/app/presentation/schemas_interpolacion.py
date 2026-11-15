"""Esquemas de entrada · Unidad I · Interpolación. Espejo: frontend/src/types/entradas/interpolacion.ts

Los valores numéricos se reciben como str (se convierten con mpmath, nunca con float).
"""
from pydantic import BaseModel, Field


class InterpolacionLinealIn(BaseModel):
    a: str = Field(description="a")
    b: str = Field(description="b")
    x: str = Field(description="x a interpolar")
    f_a: str | None = Field(None, description="f(a); opcional si se da la función")
    f_b: str | None = Field(None, description="f(b); opcional si se da la función")
    f_x: str | None = Field(None, description="f(x) valor real, para el Margen de Error Є")
    funcion: str | None = Field(None, description="f(x), p. ej. Ln(x); opcional")
    decimales: int = Field(9, ge=1, le=30)


class TablaInterpolacionIn(BaseModel):
    """Entrada común de Newton hacia Adelante, Newton hacia Atrás, Newton con Diferencias Divididas
    y Lagrange: puntos (x_i, y_i) y el valor x a interpolar."""

    x: list[str] = Field(min_length=2, description="x_i (abscisas de los datos)")
    y: list[str] = Field(min_length=2, description="y_i (ordenadas de los datos)")
    x_interpolar: str = Field(description="x en el que se obtiene g(x)")
    decimales: int = Field(9, ge=1, le=30)
