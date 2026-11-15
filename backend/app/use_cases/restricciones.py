"""Restricciones de cada método del libro, comprobadas sobre los DATOS de un problema (CAPA 2).

Antes de mostrarle un problema al alumno (recién generado o guardado en su partida) se revisa aquí que
cumpla EXACTAMENTE las condiciones del método (Libro, context/MC y context/OR). Si no las cumple, la capa
de presentación descarta los datos y plantea otros: nunca se le muestra un problema que no se pueda
resolver con el método.

`incumplimientos(slug, datos, crear_funcion)` devuelve la lista de restricciones violadas (vacía = válido).
`crear_funcion` se inyecta (puerto `FuncionUsuario`) para no depender de SymPy en esta capa.
"""
from __future__ import annotations

import itertools
from collections.abc import Callable, Sequence
from fractions import Fraction
from typing import Any

import mpmath
from mpmath import mpf

from app.domain.funciones import Derivable

mpmath.mp.dps = 50

CrearFuncion = Callable[[str, tuple[str, ...]], Derivable]
Regla = Callable[[dict[str, Any], CrearFuncion], list[str]]


# --------------------------------------------------------------------------------------------
# Utilidades
# --------------------------------------------------------------------------------------------
def _q(v: Any) -> Fraction:
    return Fraction(str(v))


def _m(v: Any) -> mpf:
    q = _q(v)
    return mpf(q.numerator) / q.denominator


def _finito(v: Any) -> bool:
    try:
        return bool(mpmath.isfinite(v)) and not isinstance(v, mpmath.mpc)
    except TypeError:
        return False


def _det(m: list[list[Fraction]]) -> Fraction:
    if len(m) == 1:
        return m[0][0]
    return sum(((-1) ** j * m[0][j] * _det([f[:j] + f[j + 1:] for f in m[1:]]) for j in range(len(m))), Fraction(0))


def es_diagonal_dominante(matriz: Sequence[Sequence[Any]]) -> bool:
    """|a_ii| > Σ_{j≠i} |a_ij| en cada renglón (la última columna es el término independiente)."""
    n = len(matriz)
    for i in range(n):
        fila = [_q(v) for v in matriz[i][:n]]
        if abs(fila[i]) <= sum((abs(fila[j]) for j in range(n) if j != i), Fraction(0)):
            return False
    return True


def _tabla(d: dict[str, Any]) -> tuple[list[Fraction], list[Fraction]]:
    return [_q(v) for v in d["x"]], [_q(v) for v in d["y"]]


def _contiene(xs: list[Fraction], x: Fraction) -> int | None:
    """Índice k del intervalo [x_k, x_{k+1}] (en cualquier sentido) que contiene a x, o None."""
    for k in range(len(xs) - 1):
        if min(xs[k], xs[k + 1]) < x < max(xs[k], xs[k + 1]):
            return k
    return None


def _lagrange(xs: list[Fraction], ys: list[Fraction], x: Fraction) -> Fraction:
    g = Fraction(0)
    for i in range(len(xs)):
        t = ys[i]
        for j in range(len(xs)):
            if j != i:
                t *= (x - xs[j]) / (xs[i] - xs[j])
        g += t
    return g


# --------------------------------------------------------------------------------------------
# Unidad I · 1 Interpolación
# --------------------------------------------------------------------------------------------
def _interpolacion_lineal(d: dict[str, Any], crear: CrearFuncion) -> list[str]:
    a, b, x = _q(d["a"]), _q(d["b"]), _q(d["x"])
    fallas = []
    if not a < x < b:
        fallas.append("x debe estar dentro del intervalo [a, b]")
    if d.get("funcion"):
        f = crear(d["funcion"], ("x",))
        if a <= 0:
            fallas.append("la función debe estar definida en el intervalo")
        else:
            for clave, p in (("f_a", a), ("f_b", b), ("f_x", x)):
                if abs(_m(d[clave]) - f(_m(p))) > mpf("1e-8"):
                    fallas.append(f"{clave} no corresponde a la función")
    return fallas


def _tabla_interpolacion(d: dict[str, Any], *, uniforme: bool | None, orden: str) -> list[str]:
    xs, ys = _tabla(d)
    x = _q(d["x_interpolar"])
    fallas = []
    if len(xs) != len(ys) or len(xs) < 3:
        return ["la tabla necesita al menos 3 puntos (x, y)"]
    if len(set(xs)) != len(xs):
        fallas.append("los valores de x no deben repetirse")
    hs = [xs[i + 1] - xs[i] for i in range(len(xs) - 1)]
    if uniforme is True and (len(set(hs)) != 1 or hs[0] <= 0):
        fallas.append("los intervalos deben ser uniformes (h constante)")
    if uniforme is False and len({abs(h) for h in hs}) != len(hs):
        fallas.append("los intervalos deben ser no uniformes")
    creciente = all(h > 0 for h in hs)
    decreciente = all(h < 0 for h in hs)
    if orden == "creciente" and not creciente:
        fallas.append("los valores de x deben ir de menor a mayor")
    if orden == "monotono" and not (creciente or decreciente):
        fallas.append("los valores de x deben estar ordenados")
    k = _contiene(xs, x)
    if k is None or x in xs:
        fallas.append("el valor a interpolar debe estar dentro de la tabla")
    elif not fallas:
        g = _lagrange(xs, ys, x)
        if not min(ys[k], ys[k + 1]) <= g <= max(ys[k], ys[k + 1]):
            fallas.append("g(x) debe quedar entre los valores de y del intervalo (nota del libro)")
    return fallas


def _newton_adelante(d, _):
    return _tabla_interpolacion(d, uniforme=True, orden="creciente")


def _newton_atras(d, _):
    return _tabla_interpolacion(d, uniforme=True, orden="creciente")


def _diferencias_divididas(d, _):
    return _tabla_interpolacion(d, uniforme=False, orden="monotono")


def _lagrange_regla(d, _):
    return _tabla_interpolacion(d, uniforme=None, orden="creciente")


# --------------------------------------------------------------------------------------------
# Unidad I · 2 Ecuaciones no lineales
# --------------------------------------------------------------------------------------------
def _grafico(d, crear):
    f = crear(d["funcion"], ("x",))
    a, b, paso = _q(d["a"]), _q(d["b"]), _q(d["paso"])
    if not a < b or paso <= 0:
        return ["se requiere a < b y un incremento positivo"]
    xs, x = [], a
    while x <= b:
        xs.append(x)
        x += paso
    ys = [f(_m(v)) for v in xs]
    if not all(_finito(y) for y in ys):
        return ["la función debe estar definida en toda la tabla"]
    if not any(ys[i] * ys[i + 1] < 0 for i in range(len(ys) - 1)):
        return ["la tabla debe presentar al menos un cambio de signo"]
    return []


def _bisectriz(d, crear):
    f = crear(d["funcion"], ("x",))
    a, b = _m(d["a"]), _m(d["b"])
    if not a < b:
        return ["se requiere a < b"]
    fa, fb = f(a), f(b)
    if not (_finito(fa) and _finito(fb) and fa > 0 > fb):
        return ["el libro requiere f(a) positiva y f(b) negativa"]
    return []


def _falsa_posicion(d, crear):
    f = crear(d["funcion"], ("x",))
    a, b = _m(d["a"]), _m(d["b"])
    fa, fb = f(a), f(b)
    if not a < b or not (_finito(fa) and _finito(fb)) or fa * fb >= 0:
        return ["f(a) y f(b) deben tener signos contrarios"]
    return []


def _secante(d, crear):
    f = crear(d["funcion"], ("x",))
    x0, x1 = _m(d["x0"]), _m(d["x1"])
    if x0 == x1 or f(x0) == f(x1):
        return ["los dos valores iniciales deben dar f(x_{i-1}) ≠ f(x_i)"]
    return []


def _newton_raphson(d, crear):
    f = crear(d["funcion"], ("x",))
    x0 = _m(d["x0"])
    derivada = crear(d["derivada"], ("x",)) if d.get("derivada") else f.derivada()
    fallas = []
    if not _finito(derivada(x0)) or abs(derivada(x0)) <= mpf("0.05"):
        fallas.append("f'(x₀) no debe ser cero (división entre cero)")
    if d.get("derivada"):
        prueba = x0 + mpf("0.37")
        if abs(derivada(prueba) - f.derivada()(prueba)) > mpf("1e-12"):
            fallas.append("la derivada escrita no corresponde a f(x)")
    return fallas


def _punto_fijo(d, crear):
    g = crear(d["funcion"], ("x",))
    x = _m(d["x0"])
    for _ in range(200):
        x = g(x)
        if not _finito(x) or abs(x) > 1e6:
            return ["la iteración x = g(x) debe converger"]
    if abs(x - g(x)) > mpf("1e-12"):
        return ["la iteración x = g(x) debe converger"]
    fallas = []
    if abs(mpmath.diff(lambda t: g(t), x)) >= 1:
        fallas.append("se requiere |g'(x)| < 1")
    if d.get("f"):
        f = crear(d["f"], ("x",))
        if abs(f(x)) > mpf("1e-10"):
            fallas.append("x = g(x) debe ser equivalente a f(x) = 0")
    return fallas


# --------------------------------------------------------------------------------------------
# Unidad II · 3 Ecuaciones lineales
# --------------------------------------------------------------------------------------------
def _matriz(d: dict[str, Any]) -> list[list[Fraction]]:
    return [[_q(v) for v in fila] for fila in d["matriz"]]


def _sistema_directo(d, _):
    m = _matriz(d)
    n = len(m)
    if n < 2 or any(len(f) != n + 1 for f in m):
        return ["la matriz aumentada debe ser de n × (n+1)"]
    if len(d.get("variables", [])) != n:
        return ["debe haber una variable por ecuación"]
    for k in range(1, n + 1):
        if _det([f[:k] for f in m[:k]]) == 0:
            return ["los pivotes deben ser distintos de cero (solución única sin intercambiar renglones)"]
    return []


def _sistema_iterativo(d, _):
    m = d["matriz"]
    n = len(m)
    fallas = []
    if n < 2 or any(len(f) != n + 1 for f in m):
        return ["la matriz aumentada debe ser de n × (n+1)"]
    if _q(d["tolerancia"]) <= 0:
        fallas.append("la tolerancia debe ser positiva")
    if not any(es_diagonal_dominante([m[i] for i in orden]) for orden in itertools.permutations(range(n))):
        fallas.append("el sistema debe ser (o poder reordenarse a) diagonal dominante")
    if _det([[_q(v) for v in f[:n]] for f in m]) == 0:
        fallas.append("el sistema debe tener solución única")
    return fallas


def _raices_polinomios(d, _):
    c = [_q(v) for v in d["coeficientes"]]
    if len(c) < 3 or c[0] == 0 or c[-1] == 0:
        return ["el polinomio debe ser de grado ≥ 2 con término independiente distinto de cero"]
    return []


# --------------------------------------------------------------------------------------------
# Unidad II · 4 Mínimos cuadrados
# --------------------------------------------------------------------------------------------
_COEFICIENTES = {"linea-recta": 2, "cuadratica": 3, "cubica": 4, "lineal-con-funcion": 3, "cuadratica-con-funcion": 4}


def _minimos_cuadrados(slug: str) -> Regla:
    def regla(d, crear):
        xs, ys = _tabla(d)
        fallas = []
        if len(xs) != len(ys) or len(xs) <= _COEFICIENTES[slug]:
            return ["se necesitan más datos (x, y) que coeficientes a calcular"]
        if not all(xs[i] < xs[i + 1] for i in range(len(xs) - 1)):
            fallas.append("los valores de x deben ser distintos y crecientes")
        if d.get("funcion"):
            f = crear(d["funcion"], ("x",))
            vals = [f(_m(v)) for v in xs]
            if not all(_finito(v) and abs(v) < 5e3 for v in vals):
                fallas.append("la función debe estar definida en todos los x (sin polos)")
        if not fallas:
            # Columnas independientes: el sistema normal tiene solución única.
            columnas = _columnas(slug, d, crear)
            filas = [[c(x) for c in columnas] for x in xs]
            k = len(columnas)
            normal = mpmath.matrix([[sum(f[i] * f[j] for f in filas) for j in range(k)] for i in range(k)])
            if abs(mpmath.det(normal)) < mpf("1e-12"):
                fallas.append("los datos deben dar un sistema con solución única")
        return fallas

    return regla


def _columnas(slug: str, d: dict[str, Any], crear: CrearFuncion) -> list[Callable[[Fraction], mpf]]:
    grado = {"linea-recta": 1, "cuadratica": 2, "cubica": 3, "lineal-con-funcion": 1, "cuadratica-con-funcion": 2}[slug]
    cols: list[Callable[[Fraction], mpf]] = [lambda x, p=p: _m(x) ** p for p in range(grado + 1)]
    if slug.endswith("con-funcion"):
        f = crear(d["funcion"], ("x",))
        cols.append(lambda x: f(_m(x)))
    return cols


# --------------------------------------------------------------------------------------------
# Unidad III · 5 Integración
# --------------------------------------------------------------------------------------------
_N_INTEGRACION: dict[str, Callable[[int], bool]] = {
    "trapezoidal": lambda n: n >= 1,
    "newton-cotes-cerradas": lambda n: 1 <= n <= 10,
    "newton-cotes-abiertas": lambda n: 1 <= n <= 6,
    "simpson-1-3": lambda n: n >= 2 and n % 2 == 0,
    "simpson-3-8": lambda n: n == 3,
}
_MENSAJE_N = {
    "trapezoidal": "n debe ser al menos 1",
    "newton-cotes-cerradas": "n debe estar en la tabla de Newton – Cotes cerradas (1 a 10)",
    "newton-cotes-abiertas": "n debe estar en la tabla de Newton – Cotes abiertas (1 a 6)",
    "simpson-1-3": "la regla de 1/3 de Simpson requiere n par",
    "simpson-3-8": "la regla de 3/8 de Simpson requiere n = 3",
}


def _integracion(slug: str) -> Regla:
    def regla(d, crear):
        a, b, n = _q(d["a"]), _q(d["b"]), int(d["n"])
        fallas = []
        if not a < b:
            fallas.append("se requiere a < b")
        if not _N_INTEGRACION[slug](n):
            fallas.append(_MENSAJE_N[slug])
        if not fallas:
            f = crear(d["funcion"], ("x",))
            muestras = [_m(a) + (_m(b) - _m(a)) * i / 20 for i in range(21)]
            if not all(_finito(f(x)) for x in muestras):
                fallas.append("la función debe estar definida en todo [a, b]")
        return fallas

    return regla


# --------------------------------------------------------------------------------------------
# Unidad IV · 6 Ecuaciones diferenciales
# --------------------------------------------------------------------------------------------
def _edo(slug: str) -> Regla:
    def regla(d, crear):
        fallas = []
        if _q(d["h"]) <= 0:
            fallas.append("h debe ser positivo")
        if int(d["pasos"]) < 1:
            fallas.append("debe haber al menos un paso")
        f = crear(d["funcion"], ("y", "t"))
        if not _finito(f(_m(d["y0"]), _m(d["t0"]))):
            fallas.append("f(y, t) debe estar definida en el punto inicial")
        if slug == "euler-modificado" and d.get("y_siguiente") not in (None, d["y0"]):
            fallas.append("Euler Modificado usa y₁ = y₀ dentro de f (libro p.66)")
        return fallas

    return regla


def _orden_superior(d, crear):
    fallas = []
    if _q(d["h"]) <= 0:
        fallas.append("h debe ser positivo")
    if int(d["pasos"]) < 1:
        fallas.append("debe haber al menos un paso")
    crear(d["funcion"], ("V", "U", "q"))  # solo variables del libro: V = y', U = y, q = t
    return fallas


REGLAS: dict[str, Regla] = {
    "interpolacion-lineal": _interpolacion_lineal,
    "newton-adelante": _newton_adelante,
    "newton-atras": _newton_atras,
    "diferencias-divididas": _diferencias_divididas,
    "lagrange": _lagrange_regla,
    "grafico": _grafico,
    "bisectriz": _bisectriz,
    "punto-fijo": _punto_fijo,
    "newton-raphson": _newton_raphson,
    "falsa-posicion": _falsa_posicion,
    "secante": _secante,
    "montante": _sistema_directo,
    "gauss-jordan": _sistema_directo,
    "eliminacion-gaussiana": _sistema_directo,
    "gauss-seidel": _sistema_iterativo,
    "jacobi": _sistema_iterativo,
    "raices-polinomios": _raices_polinomios,
    **{s: _minimos_cuadrados(s) for s in _COEFICIENTES},
    **{s: _integracion(s) for s in _N_INTEGRACION},
    **{
        s: _edo(s)
        for s in (
            "euler-adelante",
            "euler-atras",
            "euler-modificado",
            "runge-kutta-2",
            "runge-kutta-3",
            "runge-kutta-4-simpson-1-3",
            "runge-kutta-4-simpson-3-8",
        )
    },
    "runge-kutta-orden-superior": _orden_superior,
}


def incumplimientos(slug: str, datos: dict[str, Any], crear_funcion: CrearFuncion) -> list[str]:
    """Restricciones del método que los datos NO cumplen (lista vacía = el problema es válido).

    Datos mal formados (faltan claves, números ilegibles, funciones que no se pueden leer) también
    cuentan como incumplimiento: esos datos se cambian por otros.
    """
    regla = REGLAS.get(slug)
    if regla is None:
        return []
    try:
        return regla(datos, crear_funcion)
    except Exception as exc:  # noqa: BLE001 — cualquier dato ilegible invalida el problema
        return [f"datos ilegibles para el método ({type(exc).__name__})"]
