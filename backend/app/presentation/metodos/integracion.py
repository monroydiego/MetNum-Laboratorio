"""Adaptadores HTTP · Unidad III · 5 Integración."""
from fractions import Fraction

from app.domain.entities import ResultadoNumerico
from app.infrastructure.math_parser import crear_funcion
from app.presentation.registro import registrar
from app.presentation.schemas_integracion import IntegracionIn, TablasNewtonCotesIn
from app.use_cases import integracion as uc
from app.use_cases._comun import num

CAPITULO = "5 Integración"

# Ejemplos del libro
_EJ_TRAPEZOIDAL = {"funcion": "1/(1+x^2)", "a": "2", "b": "3", "n": 4, "decimales": 9}  # p.54
_EJ_ABIERTAS = {"funcion": "3x^3 - 10", "a": "-2", "b": "2", "n": 4, "decimales": 9}  # p.56
_EJ_SIMPSON_13 = {"funcion": "1/(1+x^2)", "a": "2", "b": "3", "n": 10, "decimales": 9}  # p.58
_EJ_SIMPSON_38 = {"funcion": "x^3 e^x", "a": "0", "b": "1", "n": 3, "decimales": 9}  # p.59


def _exactos(d: IntegracionIn) -> tuple[Fraction, Fraction] | None:
    """a y b como fracción exacta (para mostrar h = 1/4, x = 9/4 como el libro); None si no son racionales."""
    try:
        return Fraction(d.a.strip()), Fraction(d.b.strip())
    except (ValueError, ZeroDivisionError):
        return None


def _datos(d: IntegracionIn):
    return crear_funcion(d.funcion, ("x",)), num(d.a), num(d.b), d.n, _exactos(d), d.decimales


@registrar(slug="trapezoidal", nombre_libro="Regla Trapezoidal", pagina=53, unidad=3, capitulo=CAPITULO,
           entrada=IntegracionIn, ejemplo=_EJ_TRAPEZOIDAL)
def trapezoidal(d: IntegracionIn) -> ResultadoNumerico:
    return uc.regla_trapezoidal(*_datos(d))


@registrar(slug="newton-cotes-cerradas", nombre_libro="Newton – Cotes Cerradas", pagina=55, unidad=3,
           capitulo=CAPITULO, entrada=IntegracionIn,
           # Nota p.56: resolver el ejemplo de las abiertas por Newton – Cotes Cerradas
           ejemplo=_EJ_ABIERTAS)
def newton_cotes_cerradas(d: IntegracionIn) -> ResultadoNumerico:
    return uc.newton_cotes_cerradas(*_datos(d))


@registrar(slug="newton-cotes-abiertas", nombre_libro="Newton – Cotes Abiertas", pagina=55, unidad=3,
           capitulo=CAPITULO, entrada=IntegracionIn, ejemplo=_EJ_ABIERTAS)
def newton_cotes_abiertas(d: IntegracionIn) -> ResultadoNumerico:
    return uc.newton_cotes_abiertas(*_datos(d))


@registrar(slug="tablas-newton-cotes",
           nombre_libro="Tablas de Constantes para las fórmulas Cerradas y Abiertas de Newton – Cotes",
           pagina=57, unidad=3, capitulo=CAPITULO, entrada=TablasNewtonCotesIn, ejemplo={"tipo": "ambas"})
def tablas_newton_cotes(d: TablasNewtonCotesIn) -> ResultadoNumerico:
    return uc.tablas_newton_cotes(d.tipo)


@registrar(slug="simpson-1-3", nombre_libro="Regla de 1/3 de Simpson", pagina=58, unidad=3, capitulo=CAPITULO,
           entrada=IntegracionIn, ejemplo=_EJ_SIMPSON_13)
def simpson_1_3(d: IntegracionIn) -> ResultadoNumerico:
    return uc.simpson_1_3(*_datos(d))


@registrar(slug="simpson-3-8", nombre_libro="Regla de 3/8 de Simpson", pagina=59, unidad=3, capitulo=CAPITULO,
           entrada=IntegracionIn, ejemplo=_EJ_SIMPSON_38)
def simpson_3_8(d: IntegracionIn) -> ResultadoNumerico:
    return uc.simpson_3_8(*_datos(d))
