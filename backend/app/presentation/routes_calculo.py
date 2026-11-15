"""Endpoints de cálculo: un POST /api/calcular/{slug} por método del libro + catálogo GET /api/metodos."""
import json
import random
from dataclasses import asdict
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

import app.presentation.metodos  # noqa: F401 — registra todos los métodos
from app.presentation.problemas import problema_con_resultado, resolver_si_es_valido, revisar_problema
from app.presentation.registro import REGISTRO, MetodoRegistrado
from app.presentation.routes_docente import imagen_subida, obtener_caso_uso
from app.presentation.schemas import (
    ErrorOut,
    MetodoInfoOut,
    ProblemaOut,
    ResultadoOut,
    RevisarIn,
    RevisionOut,
    VerificacionOut,
)
from app.use_cases import respuesta_problema as rp
from app.use_cases.gestionar_evidencia import GestionarEvidencia

router = APIRouter(prefix="/api/calcular", tags=["cálculo"])
catalogo = APIRouter(prefix="/api/metodos", tags=["cálculo"])
problemas = APIRouter(prefix="/api/problemas", tags=["problemas"])


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


def _metodo(slug: str) -> MetodoRegistrado:
    metodo = REGISTRO.get(slug)
    if metodo is None:
        raise HTTPException(status_code=404, detail=f"Método «{slug}» no registrado")
    return metodo


def _campos(slug: str, resultado: dict[str, str]) -> list[str]:
    return rp.campos_respuesta(slug, resultado) if rp.tiene_respuesta(slug) else []


@catalogo.get("/{slug}/problema", response_model=ProblemaOut, responses={404: {"model": ErrorOut}})
def problema_aleatorio(slug: str, semilla: int | None = None) -> ProblemaOut:
    """Problema NUEVO para el método (datos parecidos a los del libro, que cumplen sus restricciones).

    `semilla` es opcional: con la misma semilla se obtiene el mismo problema (útil para reproducir).
    """
    metodo = _metodo(slug)
    rng = random.Random(semilla) if semilla is not None else random.Random()
    entrada, resultado = problema_con_resultado(metodo, rng)
    return ProblemaOut(slug=slug, entrada=entrada, campos_respuesta=_campos(slug, resultado.resultado))


@problemas.post("/revisar", response_model=RevisionOut, responses={404: {"model": ErrorOut}})
def revisar(datos: RevisarIn) -> RevisionOut:
    """Revisa un problema ya planteado antes de volver a mostrarlo: si sus datos no cumplen las
    restricciones del método, se CAMBIAN por otros que sí las cumplen (`reemplazado = true`)."""
    metodo = _metodo(datos.slug)
    entrada, resultado, reemplazado = revisar_problema(metodo, datos.entrada)
    return RevisionOut(
        slug=datos.slug,
        entrada=entrada,
        campos_respuesta=_campos(datos.slug, resultado.resultado),
        reemplazado=reemplazado,
    )


def _leer_json(texto: str, nombre: str) -> dict[str, Any]:
    try:
        valor = json.loads(texto)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"«{nombre}» debe ser un objeto JSON") from exc
    if not isinstance(valor, dict):
        raise HTTPException(status_code=422, detail=f"«{nombre}» debe ser un objeto JSON")
    return valor


def _recortar(texto: str, maximo: int) -> str:
    return texto if len(texto) <= maximo else texto[: maximo - 1] + "…"


def _resumen(entrada: dict[str, Any]) -> str:
    return _recortar("; ".join(f"{k} = {json.dumps(v, ensure_ascii=False)}" for k, v in entrada.items()), 255)


@problemas.post("/verificar", response_model=VerificacionOut, responses={404: {"model": ErrorOut}, 422: {"model": ErrorOut}})
async def verificar_respuesta(
    slug: Annotated[str, Form(max_length=60)],
    entrada: Annotated[str, Form(description="Datos del problema (objeto JSON)")],
    respuesta: Annotated[str, Form(description="clave -> valor que obtuvo el alumno a mano (objeto JSON)")],
    matricula: Annotated[str, Form(max_length=20)],
    nivel: Annotated[int, Form(ge=0)],
    foto_procedimiento: Annotated[UploadFile, File(description="Foto OBLIGATORIA del procedimiento hecho a mano")],
    caso_uso: Annotated[GestionarEvidencia, Depends(obtener_caso_uso)],
) -> VerificacionOut:
    """Compara lo que el alumno obtuvo a mano con el resultado del método (parte entera y 3 decimales).

    Para verificar es OBLIGATORIA la foto del procedimiento: cada intento (correcto o no) queda
    registrado con su foto para el Panel Docente. La resolución completa SOLO se entrega si es correcta.
    """
    metodo = _metodo(slug)
    if not rp.tiene_respuesta(slug):
        raise HTTPException(status_code=422, detail="Este método es de consulta: no tiene respuesta que verificar")
    datos = _leer_json(entrada, "entrada")
    dada = {str(k): str(v) for k, v in _leer_json(respuesta, "respuesta").items()}
    resultado = resolver_si_es_valido(metodo, datos)
    if resultado is None:
        raise HTTPException(status_code=422, detail="Los datos del problema no son válidos para el método: pide uno nuevo")
    veredicto = rp.verificar(slug, resultado.resultado, dada)
    correcta = rp.es_correcta(veredicto)
    guardada = caso_uso.registrar_intento(
        matricula=matricula,
        nivel=nivel,
        metodo=metodo.nombre_libro,
        funcion=_resumen(datos),
        respuesta=_recortar(
            ("Correcta" if correcta else "Incorrecta") + " · " + "; ".join(f"{k} = {dada.get(k, '')}" for k in veredicto),
            500,
        ),
        correcta=correcta,
        iteraciones=resultado.filas if correcta else [],
        foto_procedimiento=await imagen_subida(foto_procedimiento),
    )
    return VerificacionOut(
        correcta=correcta,
        campos=veredicto,
        resultado=ResultadoOut.model_validate(asdict(resultado)) if correcta else None,
        folio=guardada.id,
    )
