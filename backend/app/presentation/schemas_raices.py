"""Esquemas de entrada · Unidad I · 2 Solución de Ecuaciones no Lineales.

Espejo: frontend/src/types/entradas/raices.ts
Los valores numéricos se reciben como str (se convierten con mpmath, nunca con float).
`max_iteraciones` es una salvaguarda de implementación (el libro no la define).
"""
from pydantic import BaseModel, Field


class GraficoIn(BaseModel):
    funcion: str = Field(description="y = f(x), p. ej. x^3 - 6.5x + 2")
    a: str = Field(description="X inicial de la tabla")
    b: str = Field(description="X final de la tabla")
    paso: str = Field("1", description="Incremento de X")
    decimales: int = Field(9, ge=1, le=30)


class BisectrizIn(BaseModel):
    funcion: str = Field(description="y = f(x)")
    a: str = Field(description="a: valor donde la función se comporta positiva")
    b: str = Field(description="b: valor donde la función se comporta negativa")
    tolerancia: str = Field("0.001", description="Margen de Error Є = |x_{i+1} - x_i|")
    decimales: int = Field(9, ge=1, le=30)
    max_iteraciones: int | None = Field(None, ge=1, le=1000, description="Salvaguarda (opcional)")


class PuntoFijoIn(BaseModel):
    funcion: str = Field(description="g(x) de la forma equivalente x = g(x)")
    x0: str = Field(description="x_0: valor de inicio")
    tolerancia: str = Field("0.00001", description="Margen de Error Є = |x_{i+1} - x_i|")
    f: str | None = Field(None, description="f(x) original (opcional, solo para graficar)")
    decimales: int = Field(9, ge=1, le=30)
    max_iteraciones: int | None = Field(None, ge=1, le=1000, description="Salvaguarda (opcional)")


class NewtonRaphsonIn(BaseModel):
    funcion: str = Field(description="f(x)")
    derivada: str | None = Field(None, description="f'(x); si se omite se deriva automáticamente")
    x0: str = Field(description="x_0: valor inicial")
    tolerancia: str = Field("0.000001", description="Margen de Error Є = |x_{i+1} - x_i|")
    decimales: int = Field(9, ge=1, le=30)
    max_iteraciones: int | None = Field(None, ge=1, le=1000, description="Salvaguarda (opcional)")


class FalsaPosicionIn(BaseModel):
    funcion: str = Field(description="f(x)")
    a: str = Field(description="a")
    b: str = Field(description="b: punto fijo")
    tolerancia: str = Field("0.001", description="Margen de Error Є = |x_{i+1} - x_i|")
    decimales: int = Field(9, ge=1, le=30)
    max_iteraciones: int | None = Field(None, ge=1, le=1000, description="Salvaguarda (opcional)")


class SecanteIn(BaseModel):
    funcion: str = Field(description="f(x)")
    x0: str = Field(description="x_0")
    x1: str = Field(description="x_1")
    tolerancia: str = Field("0.001", description="Margen de Error Є = |x_{i+1} - x_i|")
    decimales: int = Field(9, ge=1, le=30)
    max_iteraciones: int | None = Field(None, ge=1, le=1000, description="Salvaguarda (opcional)")
