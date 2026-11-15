"""Adaptadores HTTP · Unidad I · 2 Solución de Ecuaciones no Lineales."""
from app.domain.entities import ResultadoNumerico
from app.infrastructure.math_parser import crear_funcion
from app.presentation.registro import registrar
from app.presentation.schemas_raices import (
    BisectrizIn,
    FalsaPosicionIn,
    GraficoIn,
    NewtonRaphsonIn,
    PuntoFijoIn,
    SecanteIn,
)
from app.use_cases import raices as uc
from app.use_cases._comun import MAX_ITERACIONES, num

CAPITULO = "2 Solución de Ecuaciones no Lineales"


def _max(valor: int | None) -> int:
    return valor if valor is not None else MAX_ITERACIONES


@registrar(
    slug="grafico",
    nombre_libro="Gráfico",
    pagina=15,
    unidad=1,
    capitulo=CAPITULO,
    entrada=GraficoIn,
    # Ejemplo p.15: y = x^3 - 6.5x + 2, X = -3 .. 3
    ejemplo={"funcion": "x^3 - 6.5x + 2", "a": "-3", "b": "3", "paso": "1", "decimales": 9},
)
def grafico(d: GraficoIn) -> ResultadoNumerico:
    return uc.grafico(crear_funcion(d.funcion), num(d.a), num(d.b), num(d.paso), d.decimales)


@registrar(
    slug="bisectriz",
    nombre_libro="Bisectriz",
    pagina=16,
    unidad=1,
    capitulo=CAPITULO,
    entrada=BisectrizIn,
    # Ejemplo p.16: y = x^3 - 6.5x + 2 entre a = 0 (+) y b = 1 (-)
    ejemplo={"funcion": "x^3 - 6.5x + 2", "a": "0", "b": "1", "tolerancia": "0.001", "decimales": 9},
)
def bisectriz(d: BisectrizIn) -> ResultadoNumerico:
    return uc.bisectriz(
        crear_funcion(d.funcion), num(d.a), num(d.b), num(d.tolerancia), d.decimales, _max(d.max_iteraciones)
    )


@registrar(
    slug="punto-fijo",
    nombre_libro="Punto Fijo ó Sustituciones Sucesivas",
    pagina=17,
    unidad=1,
    capitulo=CAPITULO,
    entrada=PuntoFijoIn,
    # Ejemplo p.18: y = 2x - e^x + 2, x = (e^x - 2)/2, x_0 = 0
    ejemplo={"funcion": "(e^x - 2)/2", "x0": "0", "tolerancia": "0.00001", "f": "2x - e^x + 2",
             "decimales": 9},
)
def punto_fijo(d: PuntoFijoIn) -> ResultadoNumerico:
    f = crear_funcion(d.f) if d.f else None
    return uc.punto_fijo(
        crear_funcion(d.funcion), num(d.x0), num(d.tolerancia), d.decimales, _max(d.max_iteraciones), f
    )


@registrar(
    slug="newton-raphson",
    nombre_libro="Newton – Raphson",
    pagina=19,
    unidad=1,
    capitulo=CAPITULO,
    entrada=NewtonRaphsonIn,
    # Ejemplo p.20: f(x) = 0.8x^2 + x - 3, f'(x) = 1.6x + 1, x_0 = 1
    ejemplo={"funcion": "0.8x^2 + x - 3", "derivada": "1.6x + 1", "x0": "1", "tolerancia": "0.000001",
             "decimales": 9},
)
def newton_raphson(d: NewtonRaphsonIn) -> ResultadoNumerico:
    f = crear_funcion(d.funcion)
    derivada = crear_funcion(d.derivada) if d.derivada else f.derivada()
    return uc.newton_raphson(f, derivada, num(d.x0), num(d.tolerancia), d.decimales, _max(d.max_iteraciones))


@registrar(
    slug="falsa-posicion",
    nombre_libro="Falsa Posición ó Regula – Falsi",
    pagina=21,
    unidad=1,
    capitulo=CAPITULO,
    entrada=FalsaPosicionIn,
    # Ejemplo p.22: f(x) = x e^x - 10, a = 1, b = 2
    ejemplo={"funcion": "x e^x - 10", "a": "1", "b": "2", "tolerancia": "0.001", "decimales": 9},
)
def falsa_posicion(d: FalsaPosicionIn) -> ResultadoNumerico:
    return uc.falsa_posicion(
        crear_funcion(d.funcion), num(d.a), num(d.b), num(d.tolerancia), d.decimales, _max(d.max_iteraciones)
    )


@registrar(
    slug="secante",
    nombre_libro="Secante",
    pagina=23,
    unidad=1,
    capitulo=CAPITULO,
    entrada=SecanteIn,
    # Ejemplo p.24: f(x) = e^{-x} - x, x_0 = 0, x_1 = 1
    ejemplo={"funcion": "e^(-x) - x", "x0": "0", "x1": "1", "tolerancia": "0.001", "decimales": 9},
)
def secante(d: SecanteIn) -> ResultadoNumerico:
    return uc.secante(
        crear_funcion(d.funcion), num(d.x0), num(d.x1), num(d.tolerancia), d.decimales, _max(d.max_iteraciones)
    )
