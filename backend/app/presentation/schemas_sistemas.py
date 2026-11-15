"""Esquemas de entrada · Unidad II · 3 Solución de Ecuaciones Lineales.
Espejo: frontend/src/types/entradas/sistemas.ts

Los valores numéricos se reciben como str ("2", "-1/3", "0.5"): los métodos directos los
convierten a fracciones exactas y los iterativos a mpmath, nunca a float.
"""
from pydantic import BaseModel, Field


class SistemaDirectoIn(BaseModel):
    matriz: list[list[str]] = Field(
        min_length=2,
        description="Matriz aumentada [A|b], renglón por renglón (n renglones de n + 1 elementos)",
    )
    variables: list[str] | None = Field(
        None, description="Nombres de las variables en orden; por defecto los del libro"
    )
    decimales: int = Field(9, ge=1, le=30, description="Decimales del valor decimal de apoyo")


class MontanteIn(SistemaDirectoIn):
    """Montante (p.29). Variables por defecto: a, b, c."""


class GaussJordanIn(SistemaDirectoIn):
    """Gauss – Jordán (p.32). Variables por defecto: a, b, c."""


class EliminacionGaussianaIn(SistemaDirectoIn):
    """Eliminación Gaussiana (p.34). Variables por defecto: x₁, x₂, x₃."""


class SistemaIterativoIn(SistemaDirectoIn):
    tolerancia: str = Field("0.001", description="Margen de error ε")


class GaussSeidelIn(SistemaIterativoIn):
    """Gauss – Seidel (p.36). Variables por defecto: x, y, z. Inicia con cero."""


class JacobiIn(SistemaIterativoIn):
    """Jacobi (p.39). Variables por defecto: x, y, z. Inicia con uno."""


class RaicesPolinomiosIn(BaseModel):
    coeficientes: list[str] = Field(
        min_length=2,
        description="Coeficientes en orden decreciente con respecto al grado, p. ej. x² + x − 6 "
        "-> [\"1\", \"1\", \"-6\"]",
    )
    decimales: int = Field(9, ge=1, le=30)
