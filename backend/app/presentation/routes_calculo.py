"""Endpoints de cálculo: un POST /api/calcular/{slug} por método del libro + catálogo GET /api/metodos."""
from dataclasses import asdict
from typing import Any

from fastapi import APIRouter

import app.presentation.metodos  # noqa: F401 — registra todos los métodos
from app.presentation.registro import REGISTRO, MetodoRegistrado
from app.presentation.schemas import ErrorOut, MetodoInfoOut, ResultadoOut

router = APIRouter(prefix="/api/calcular", tags=["cálculo"])
catalogo = APIRouter(prefix="/api/metodos", tags=["cálculo"])


def _crear_endpoint(metodo: MetodoRegistrado):
    Entrada = metodo.entrada

    def endpoint(datos: Entrada) -> ResultadoOut:  # type: ignore[valid-type]
        return ResultadoOut.model_validate(asdict(metodo.ejecutar(datos)))

    endpoint.__name__ = f"calcular_{metodo.slug.replace('-', '_')}"
    endpoint.__doc__ = f"{metodo.nombre_libro} (libro, p.{metodo.pagina})."
    return endpoint


for _m in REGISTRO.values():
    router.add_api_route(
        f"/{_m.slug}",
        _crear_endpoint(_m),
        methods=["POST"],
        response_model=ResultadoOut,
        responses={422: {"model": ErrorOut}},
        summary=_m.nombre_libro,
    )


def _info(m: MetodoRegistrado) -> dict[str, Any]:
    return {
        "slug": m.slug,
        "nombre_libro": m.nombre_libro,
        "pagina": m.pagina,
        "unidad": m.unidad,
        "capitulo": m.capitulo,
        "esquema_entrada": m.entrada.model_json_schema(),
        "ejemplo": m.ejemplo,
    }


@catalogo.get("", response_model=list[MetodoInfoOut])
def listar_metodos() -> list[dict[str, Any]]:
    return [_info(m) for m in REGISTRO.values()]
