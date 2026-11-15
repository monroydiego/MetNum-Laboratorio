"""Adaptadores HTTP · Unidad IV · 6 Ecuaciones Diferenciales Ordinarias (libro p.62–73)."""
from app.domain.entities import ResultadoNumerico
from app.infrastructure.math_parser import crear_funcion
from app.presentation.registro import registrar
from app.presentation.schemas_edos import EdoArranqueIn, EdoIn, EdoOrdenSuperiorIn
from app.use_cases import edos as uc
from app.use_cases._comun import num

CAPITULO = "6 Ecuaciones Diferenciales Ordinarias"
VARIABLES = ("y", "t")  # f(y_n, t_n): y primero, t después (notación del libro)
VARIABLES_ORDEN_SUPERIOR = ("V", "U", "q")  # V_n = y', U_n = y, q_n = t


def _opcional(valor: str | None):
    return num(valor) if valor not in (None, "") else None


@registrar(
    slug="euler-adelante", nombre_libro="Euler hacia Adelante", pagina=63, unidad=4,
    capitulo=CAPITULO, entrada=EdoIn,
    # Ejemplo p.64: 3y' - 5yt + 1 = 0, y_0 = 2, h = 0.2 -> y_1 = 1.933333333, y_2 = 1.995555556
    ejemplo={"funcion": "(5yt - 1)/3", "y0": "2", "h": "0.2", "t0": "0", "pasos": 2, "decimales": 9},
)
def euler_adelante(d: EdoIn) -> ResultadoNumerico:
    f = crear_funcion(d.funcion, VARIABLES)
    return uc.euler_adelante(f, num(d.y0), num(d.h), num(d.t0), d.pasos, d.decimales)


@registrar(
    slug="euler-atras", nombre_libro="Euler hacia Atrás", pagina=65, unidad=4,
    capitulo=CAPITULO, entrada=EdoArranqueIn,
    # El libro no resuelve ejemplo (p.65); se usa el de Euler hacia Adelante.
    ejemplo={"funcion": "(5yt - 1)/3", "y0": "2", "h": "0.2", "t0": "0", "pasos": 1,
             "y_siguiente": None, "decimales": 9},
)
def euler_atras(d: EdoArranqueIn) -> ResultadoNumerico:
    f = crear_funcion(d.funcion, VARIABLES)
    return uc.euler_atras(f, num(d.y0), num(d.h), num(d.t0), d.pasos, _opcional(d.y_siguiente),
                          d.decimales)


@registrar(
    slug="euler-modificado", nombre_libro="Euler Modificado", pagina=66, unidad=4,
    capitulo=CAPITULO, entrada=EdoArranqueIn,
    # Ejemplo p.66: 2y' + 3yt + y = 0, y_0 = 1.2, h = 0.3, y_1 = 1.2 -> y'_1 = 0.939
    ejemplo={"funcion": "(-3yt - y)/2", "y0": "1.2", "h": "0.3", "t0": "0", "pasos": 1,
             "y_siguiente": "1.2", "decimales": 9},
)
def euler_modificado(d: EdoArranqueIn) -> ResultadoNumerico:
    f = crear_funcion(d.funcion, VARIABLES)
    return uc.euler_modificado(f, num(d.y0), num(d.h), num(d.t0), d.pasos,
                               _opcional(d.y_siguiente), d.decimales)


@registrar(
    slug="runge-kutta-2", nombre_libro="Runge – Kutta de 2do orden", pagina=68, unidad=4,
    capitulo=CAPITULO, entrada=EdoIn,
    # Ejemplo p.68: y' - 2ty + 1 = 0, y_0 = 1, h = 0.6
    ejemplo={"funcion": "2ty - 1", "y0": "1", "h": "0.6", "t0": "0", "pasos": 1, "decimales": 9},
)
def runge_kutta_2(d: EdoIn) -> ResultadoNumerico:
    f = crear_funcion(d.funcion, VARIABLES)
    return uc.runge_kutta_2(f, num(d.y0), num(d.h), num(d.t0), d.pasos, d.decimales)


@registrar(
    slug="runge-kutta-3", nombre_libro="Runge – Kutta de 3er orden", pagina=69, unidad=4,
    capitulo=CAPITULO, entrada=EdoIn,
    # Ejemplo p.69: y' = (2yt + 1)/y^2, y_0 = 1, h = 0.25
    ejemplo={"funcion": "(2yt + 1)/y^2", "y0": "1", "h": "0.25", "t0": "0", "pasos": 1,
             "decimales": 9},
)
def runge_kutta_3(d: EdoIn) -> ResultadoNumerico:
    f = crear_funcion(d.funcion, VARIABLES)
    return uc.runge_kutta_3(f, num(d.y0), num(d.h), num(d.t0), d.pasos, d.decimales)


@registrar(
    slug="runge-kutta-4-simpson-1-3", nombre_libro="Runge – Kutta de 4to orden por 1/3 de Simpson",
    pagina=70, unidad=4, capitulo=CAPITULO, entrada=EdoIn,
    # Ejemplo p.70: y' = (y + t)^2/(1 - y), y = 0.4, h = 0.2 -> y_1 = 0.511617621
    ejemplo={"funcion": "(y + t)^2/(1 - y)", "y0": "0.4", "h": "0.2", "t0": "0", "pasos": 1,
             "decimales": 9},
)
def runge_kutta_4_simpson_1_3(d: EdoIn) -> ResultadoNumerico:
    f = crear_funcion(d.funcion, VARIABLES)
    return uc.runge_kutta_4_simpson_1_3(f, num(d.y0), num(d.h), num(d.t0), d.pasos, d.decimales)


@registrar(
    slug="runge-kutta-4-simpson-3-8", nombre_libro="Runge – Kutta de 4to orden por 3/8 de Simpson",
    pagina=71, unidad=4, capitulo=CAPITULO, entrada=EdoIn,
    # Ejemplo p.71: y' = -y/(y^2 + t), y_0 = 1, h = 0.5 -> y_1 = 0.552579997
    ejemplo={"funcion": "-y/(y^2 + t)", "y0": "1", "h": "0.5", "t0": "0", "pasos": 1,
             "decimales": 9},
)
def runge_kutta_4_simpson_3_8(d: EdoIn) -> ResultadoNumerico:
    f = crear_funcion(d.funcion, VARIABLES)
    return uc.runge_kutta_4_simpson_3_8(f, num(d.y0), num(d.h), num(d.t0), d.pasos, d.decimales)


@registrar(
    slug="runge-kutta-orden-superior", nombre_libro="Runge – Kutta de Orden Superior", pagina=72,
    unidad=4, capitulo=CAPITULO, entrada=EdoOrdenSuperiorIn,
    # Ejemplo p.72–73: y'' = 2y't - y (tal como lo despeja el libro), y_0 = 1.1, y'_0 = 1.2, h = 0.2
    ejemplo={"funcion": "2Vq - U", "y0": "1.1", "yp0": "1.2", "h": "0.2", "q0": "0", "pasos": 1,
             "decimales": 9},
)
def runge_kutta_orden_superior(d: EdoOrdenSuperiorIn) -> ResultadoNumerico:
    f = crear_funcion(d.funcion, VARIABLES_ORDEN_SUPERIOR)
    return uc.runge_kutta_orden_superior(f, num(d.y0), num(d.yp0), num(d.h), num(d.q0), d.pasos,
                                         d.decimales)
