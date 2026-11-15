"""Adaptadores HTTP · Unidad I · 1 Interpolación."""
from app.domain.entities import ResultadoNumerico
from app.domain.funciones import ErrorMetodo
from app.infrastructure.math_parser import crear_funcion
from app.presentation.registro import registrar
from app.presentation.schemas_interpolacion import InterpolacionLinealIn, TablaInterpolacionIn
from app.use_cases import interpolacion as uc
from app.use_cases._comun import num

CAPITULO = "1 Interpolación"


@registrar(
    slug="interpolacion-lineal",
    nombre_libro="Interpolación Lineal",
    pagina=4,
    unidad=1,
    capitulo=CAPITULO,
    entrada=InterpolacionLinealIn,
    # Ejemplo p.5 a): Estimar Ln 4 entre Ln 2 y Ln 5
    ejemplo={"a": "2", "b": "5", "x": "4", "f_a": "0.69314718", "f_b": "1.609437912",
             "f_x": "1.386294361", "funcion": "Ln(x)", "decimales": 9},
)
def interpolacion_lineal(d: InterpolacionLinealIn) -> ResultadoNumerico:
    f = crear_funcion(d.funcion) if d.funcion else None
    a, b, x = num(d.a), num(d.b), num(d.x)

    def valor(dado: str | None, punto, nombre: str):
        if dado not in (None, ""):
            return num(dado)
        if f is None:
            raise ErrorMetodo(f"Falta {nombre}: escribe su valor o la función f(x)")
        return f(punto)

    f_a = valor(d.f_a, a, "f(a)")
    f_b = valor(d.f_b, b, "f(b)")
    f_x = num(d.f_x) if d.f_x not in (None, "") else (f(x) if f else None)
    return uc.interpolacion_lineal(a, b, f_a, f_b, x, f_x, f, d.decimales)


# Ejemplo de p.8, p.10 y p.14: Obtener g(x) para x = 2.4
_EJEMPLO_UNIFORME = {"x": ["2.2", "2.5", "2.8"], "y": ["2.54", "2.82", "3.21"], "x_interpolar": "2.4",
                     "decimales": 9}


def _tabla(d: TablaInterpolacionIn):
    if len(d.x) != len(d.y):
        raise ErrorMetodo("Las listas x_i y y_i deben tener la misma cantidad de puntos")
    return [num(v) for v in d.x], [num(v) for v in d.y], num(d.x_interpolar)


@registrar(
    slug="newton-adelante",
    nombre_libro="Newton hacia Adelante",
    pagina=6,
    unidad=1,
    capitulo=CAPITULO,
    entrada=TablaInterpolacionIn,
    ejemplo=_EJEMPLO_UNIFORME,
)
def newton_adelante(d: TablaInterpolacionIn) -> ResultadoNumerico:
    x, y, punto = _tabla(d)
    return uc.newton_adelante(x, y, punto, d.decimales)


@registrar(
    slug="newton-atras",
    nombre_libro="Newton hacia Atrás",
    pagina=9,
    unidad=1,
    capitulo=CAPITULO,
    entrada=TablaInterpolacionIn,
    ejemplo=_EJEMPLO_UNIFORME,
)
def newton_atras(d: TablaInterpolacionIn) -> ResultadoNumerico:
    x, y, punto = _tabla(d)
    return uc.newton_atras(x, y, punto, d.decimales)


@registrar(
    slug="diferencias-divididas",
    nombre_libro="Newton con Diferencias Divididas",
    pagina=11,
    unidad=1,
    capitulo=CAPITULO,
    entrada=TablaInterpolacionIn,
    # Ejemplo p.11–12: Encuentre g(x) para x = 3.5
    ejemplo={"x": ["4.4", "3.7", "3.1"], "y": ["-0.68", "-1.59", "-1.82"], "x_interpolar": "3.5",
             "decimales": 9},
)
def diferencias_divididas(d: TablaInterpolacionIn) -> ResultadoNumerico:
    x, y, punto = _tabla(d)
    return uc.diferencias_divididas(x, y, punto, d.decimales)


@registrar(
    slug="lagrange",
    nombre_libro="Lagrange",
    pagina=13,
    unidad=1,
    capitulo=CAPITULO,
    entrada=TablaInterpolacionIn,
    ejemplo=_EJEMPLO_UNIFORME,
)
def lagrange(d: TablaInterpolacionIn) -> ResultadoNumerico:
    x, y, punto = _tabla(d)
    return uc.lagrange(x, y, punto, d.decimales)
