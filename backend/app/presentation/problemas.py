"""Problemas aleatorios verificados: el generador (use_cases) propone y el método real dispone.

Un problema solo se le muestra al alumno si:
  (1) valida contra el esquema de entrada del método,
  (2) cumple las restricciones del método del libro (`use_cases/restricciones.py`),
  (3) el método lo resuelve sin error y SIN avisos de no convergencia / divergencia y
  (4) no es idéntico al ejemplo del libro (los datos deben parecerse a los del libro, no copiarlos).
Si un candidato falla cualquiera de las cuatro, se CAMBIAN los datos (se sortea otro) de inmediato; al
alumno nunca le llega un problema irresoluble ni un aviso de "no se puede resolver".
"""
import random
from typing import Any

from app.domain.entities import ResultadoNumerico
from app.domain.funciones import ErrorMetodo
from app.infrastructure.math_parser import crear_funcion
from app.presentation.registro import MetodoRegistrado
from app.use_cases.generador_problemas import generar_problema
from app.use_cases.restricciones import incumplimientos

INTENTOS = 400
# Métodos cuyo "problema" tiene muy pocas variantes (tablas fijas del libro): puede repetir el ejemplo.
_PUEDE_REPETIR_EJEMPLO = {"tablas-newton-cotes"}
_AVISOS_DE_FALLA = ("máximo de", "diverge", "no converger", "no puede reordenarse", "sin cumplir")


def resolver_si_es_valido(metodo: MetodoRegistrado, datos: Any) -> ResultadoNumerico | None:
    """Resultado del método si los datos cumplen TODAS las condiciones (1)–(3); si no, None."""
    if not isinstance(datos, dict):
        return None
    try:
        entrada = metodo.entrada.model_validate(datos)
    except Exception:  # noqa: BLE001
        return None
    if incumplimientos(metodo.slug, datos, crear_funcion):
        return None
    try:
        resultado = metodo.ejecutar(entrada)
    except Exception:  # noqa: BLE001 — cualquier falla invalida los datos
        return None
    if any(clave in aviso for aviso in resultado.advertencias for clave in _AVISOS_DE_FALLA):
        return None
    return resultado


def problema_con_resultado(
    metodo: MetodoRegistrado, rng: random.Random | None = None
) -> tuple[dict[str, Any], ResultadoNumerico]:
    """(entrada, resultado del método): el resultado sirve para saber qué debe responder el alumno."""
    rng = rng or random.Random()
    for _ in range(INTENTOS):
        try:
            datos = generar_problema(metodo.slug, rng)
        except ErrorMetodo:
            continue
        if datos == metodo.ejemplo and metodo.slug not in _PUEDE_REPETIR_EJEMPLO:
            continue
        resultado = resolver_si_es_valido(metodo, datos)
        if resultado is not None:
            return datos, resultado
    # Prácticamente imposible (cada generador garantiza sus restricciones): error del servidor, no del alumno.
    raise RuntimeError(f"El generador de «{metodo.nombre_libro}» no produjo datos válidos en {INTENTOS} intentos")


def problema_verificado(metodo: MetodoRegistrado, rng: random.Random | None = None) -> dict[str, Any]:
    return problema_con_resultado(metodo, rng)[0]


def revisar_problema(
    metodo: MetodoRegistrado, datos: Any, rng: random.Random | None = None
) -> tuple[dict[str, Any], ResultadoNumerico, bool]:
    """Revisa un problema ya planteado (p. ej. guardado en la partida).

    Devuelve (entrada, resultado, reemplazado): si los datos ya no cumplen las restricciones del método
    se sustituyen por un problema nuevo que sí las cumple.
    """
    resultado = resolver_si_es_valido(metodo, datos)
    if resultado is not None:
        return datos, resultado, False
    nuevos, resultado = problema_con_resultado(metodo, rng)
    return nuevos, resultado, True
