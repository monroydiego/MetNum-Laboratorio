"""Registro de métodos: cada módulo de `presentation/metodos/` registra sus endpoints aquí.

`routes_calculo.py` crea un `POST /api/calcular/{slug}` por cada método registrado, con su propio
esquema Pydantic de entrada, y `GET /api/metodos` publica el catálogo (para formularios del frontend).
"""
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel

from app.domain.entities import ResultadoNumerico


@dataclass(frozen=True)
class MetodoRegistrado:
    slug: str
    nombre_libro: str
    pagina: int
    unidad: int
    capitulo: str
    entrada: type[BaseModel]
    ejemplo: dict[str, Any]
    ejecutar: Callable[[Any], ResultadoNumerico]


REGISTRO: dict[str, MetodoRegistrado] = {}


def registrar(
    *,
    slug: str,
    nombre_libro: str,
    pagina: int,
    unidad: int,
    capitulo: str,
    entrada: type[BaseModel],
    ejemplo: dict[str, Any],
) -> Callable[[Callable[[Any], ResultadoNumerico]], Callable[[Any], ResultadoNumerico]]:
    def decorador(fn: Callable[[Any], ResultadoNumerico]) -> Callable[[Any], ResultadoNumerico]:
        if slug in REGISTRO:
            raise RuntimeError(f"Método duplicado: {slug}")
        entrada.model_validate(ejemplo)  # el ejemplo del libro debe ser una entrada válida
        REGISTRO[slug] = MetodoRegistrado(
            slug, nombre_libro, pagina, unidad, capitulo, entrada, ejemplo, fn
        )
        return fn

    return decorador
