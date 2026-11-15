"""Generador de problemas aleatorios para cada método del libro (CAPA 2: solo usa stdlib y mpmath).

Cada vez que el alumno entra a un método se le plantea un problema DISTINTO, con datos parecidos a los
ejemplos del libro y a las "Actividades Fundamentales" (context/MC y context/OR): números pequeños,
funciones sencillas (polinomios, e^x, Ln) y trigonometría (sen, cos, tg, ctg) solo donde el curso la usa.

Reglas de diseño
- Los datos viven en Fraction/enteros y salen como `str` (precisión: nada pasa por float al serializar).
- Cada generador GARANTIZA las restricciones del método antes de devolver el problema
  (intervalos uniformes, diagonal dominante, cambio de signo, convergencia, n par, etc.). Si un candidato
  no cumple, se descarta y se sortea otro.
- Verificación adicional (capa de presentación): el problema se ejecuta con el método real y se descarta
  si falla, no converge o es idéntico al ejemplo del libro (ver `routes_calculo.py`).
"""
from __future__ import annotations

import math
import random
from collections.abc import Callable
from decimal import Decimal
from fractions import Fraction
from typing import Any

import mpmath
from mpmath import mpf

from app.domain.funciones import ErrorMetodo
from app.use_cases._comun import fmt

mpmath.mp.dps = 50

Generador = Callable[[random.Random], dict[str, Any]]
MAX_INTENTOS = 600


# --------------------------------------------------------------------------------------------
# Utilidades
# --------------------------------------------------------------------------------------------
def _txt(valor: Fraction | int) -> str:
    """Decimal exacto como texto ("3.5", "-2", "0.25"); el denominador debe ser de la forma 2^a·5^b."""
    q = Fraction(valor)
    texto = format((Decimal(q.numerator) / Decimal(q.denominator)).normalize(), "f")
    return "0" if texto in ("-0", "") else texto


def _dec(rng: random.Random, minimo: float, maximo: float, k: int = 1) -> Fraction:
    """Número aleatorio con `k` decimales en [minimo, maximo]."""
    escala = 10**k
    return Fraction(rng.randint(round(minimo * escala), round(maximo * escala)), escala)


def _fallo(slug: str) -> ErrorMetodo:
    return ErrorMetodo(f"No se pudo generar un problema válido para «{slug}»")


def _coef(c: int) -> str:
    """Coeficiente principal: 1 -> "", -1 -> "-", otro -> "3"."""
    return "" if c == 1 else "-" if c == -1 else str(c)


def _a_mpf(q: Fraction) -> mpf:
    return mpf(q.numerator) / mpf(q.denominator)


# --------------------------------------------------------------------------------------------
# Unidad I · 1 Interpolación
# --------------------------------------------------------------------------------------------
def _lagrange_exacto(xs: list[Fraction], ys: list[Fraction], x: Fraction) -> Fraction:
    total = Fraction(0)
    for i in range(len(xs)):
        termino = ys[i]
        for j in range(len(xs)):
            if j != i:
                termino *= (x - xs[j]) / (xs[i] - xs[j])
        total += termino
    return total


def _g_entre_los_y(xs: list[Fraction], ys: list[Fraction], x: Fraction, g: Fraction) -> bool:
    """Nota del libro (p.7): g(x) queda entre los valores de y del intervalo que contiene a x."""
    for k in range(len(xs) - 1):
        if min(xs[k], xs[k + 1]) < x < max(xs[k], xs[k + 1]):
            return min(ys[k], ys[k + 1]) <= g <= max(ys[k], ys[k + 1])
    return False


def interpolacion_lineal(rng: random.Random) -> dict[str, Any]:
    """Ejemplo del libro: estimar Ln 3 con Ln 2 y Ln 5. Se exige a < x < b con x entero y a ≥ 1."""
    a = rng.randint(1, 9)
    b = a + rng.randint(2, 6)
    x = rng.randint(a + 1, b - 1)
    f = mpmath.log
    return {
        "a": str(a), "b": str(b), "x": str(x),
        "f_a": fmt(f(a)), "f_b": fmt(f(b)), "f_x": fmt(f(x)),
        "funcion": "Ln(x)", "decimales": 9,
    }


def _tabla(rng: random.Random, *, uniforme: bool, descendente: bool = False,
           puntos: tuple[int, int] = (3, 5), y_minimo: float = 0.2) -> dict[str, Any]:
    """Tabla (x_i, y_i) con x_i crecientes (o decrecientes en Diferencias Divididas, como el libro),
    intervalos uniformes o NO uniformes (todos los h distintos) y x_interpolar dentro del intervalo."""
    for _ in range(MAX_INTENTOS):
        n = rng.randint(*puntos)
        x1 = _dec(rng, 1, 7)
        if uniforme:
            pasos = [Fraction(rng.randint(3, 8), 10)] * (n - 1)
        else:
            pasos = [Fraction(v, 10) for v in rng.sample(range(3, 11), n - 1)]  # h_i todos distintos
        xs = [x1]
        for h in pasos:
            xs.append(xs[-1] + h)
        ys = [_dec(rng, y_minimo, y_minimo + 2.8, 2)]
        for _i in range(n - 1):
            ys.append(ys[-1] + _dec(rng, 0.10, 0.70, 2))
        k = rng.randrange(n - 1)
        # x con un decimal, estrictamente dentro de (x_k, x_{k+1}): nunca coincide con un dato
        candidatos = [Fraction(m, 10) for m in range(math.floor(xs[k] * 10) + 1, math.ceil(xs[k + 1] * 10))
                      if xs[k] < Fraction(m, 10) < xs[k + 1]]
        if not candidatos:
            continue
        x = rng.choice(candidatos)
        if not _g_entre_los_y(xs, ys, x, _lagrange_exacto(xs, ys, x)):
            continue
        if descendente:
            xs, ys = xs[::-1], ys[::-1]
        return {"x": [_txt(v) for v in xs], "y": [_txt(v) for v in ys], "x_interpolar": _txt(x),
                "decimales": 9}
    raise _fallo("interpolación")


def newton_adelante(rng: random.Random) -> dict[str, Any]:
    return _tabla(rng, uniforme=True)  # h = x_{i+1} − x_i constante, s = (x − x_1)/h > 0


def newton_atras(rng: random.Random) -> dict[str, Any]:
    return _tabla(rng, uniforme=True)  # h constante, s = (x − x_n)/h < 0


def diferencias_divididas(rng: random.Random) -> dict[str, Any]:
    return _tabla(rng, uniforme=False, descendente=rng.random() < 0.4, y_minimo=-2.0)


def lagrange(rng: random.Random) -> dict[str, Any]:
    return _tabla(rng, uniforme=rng.random() < 0.5)  # "se aplica para intervalos uniformes y no uniformes"


# --------------------------------------------------------------------------------------------
# Unidad I · 2 Ecuaciones no lineales
# --------------------------------------------------------------------------------------------
class _Funcion:
    """f(x) como texto del libro y como callable de mpmath, con derivada textual opcional."""

    def __init__(self, texto: str, f: Callable[[mpf], mpf], derivada: str | None = None) -> None:
        self.texto, self.f, self.derivada = texto, f, derivada

    def __call__(self, x: mpf) -> mpf:
        return self.f(x)


def _cuadratica(rng: random.Random) -> _Funcion:  # AcF: f(x) = 2x² − 6x − A
    a, b, c = rng.choice([1, 2, 3]), rng.randint(2, 8), rng.randint(1, 9)
    return _Funcion(f"{_coef(a)}x^2 - {b}x - {c}", lambda x: a * x * x - b * x - c, f"{2 * a}x - {b}")


def _cubica(rng: random.Random) -> _Funcion:  # Gráfico/Bisectriz: y = x³ − 6.5x + 2
    k = rng.choice(["3", "4", "5", "6", "6.5", "7", "8", "9"])
    c = rng.randint(1, 4)
    kk = mpf(k)
    return _Funcion(f"x^3 - {k}x + {c}", lambda x: x**3 - kk * x + c, f"3x^2 - {k}")


def _cubica_monotona(rng: random.Random) -> _Funcion:  # NR: x³ + 2x² + 10x − 20 (f' > 0 siempre)
    p, q, r = rng.choice([1, 2, 3]), rng.randint(8, 12), rng.randint(5, 30)
    return _Funcion(f"x^3 + {_coef(p)}x^2 + {q}x - {r}", lambda x: x**3 + p * x**2 + q * x - r,
                    f"3x^2 + {2 * p}x + {q}")


def _exponencial(rng: random.Random) -> _Funcion:  # AcF: f(x) = e^{4x} − B
    k, b = rng.choice([2, 3, 4]), rng.randint(2, 9)
    return _Funcion(f"e^({k}x) - {b}", lambda x: mpmath.exp(k * x) - b, f"{k}e^({k}x)")


def _x_exp(rng: random.Random) -> _Funcion:  # Falsa Posición: f(x) = x e^x − 10
    c = rng.randint(3, 20)
    return _Funcion(f"x e^x - {c}", lambda x: x * mpmath.exp(x) - c, None)


def _decreciente(rng: random.Random) -> _Funcion:  # Secante: f(x) = e^{-x} − x
    c = rng.choice([1, 2, 3])
    return _Funcion(f"e^(-x) - {_coef(c)}x", lambda x: mpmath.exp(-x) - c * x, f"-e^(-x) - {c}")


_FAMILIAS: list[Callable[[random.Random], _Funcion]] = [
    _cuadratica, _cubica, _cubica_monotona, _exponencial, _x_exp, _decreciente,
]


def _cambios_de_signo(f: Callable[[mpf], mpf], a: mpf, b: mpf, muestras: int = 240) -> int:
    signos = []
    for i in range(muestras + 1):
        v = f(a + (b - a) * i / muestras)
        signos.append(0 if v == 0 else (1 if v > 0 else -1))
    signos = [s for s in signos if s != 0]
    return sum(1 for i in range(len(signos) - 1) if signos[i] != signos[i + 1])


def _con_cambio_unico(f: _Funcion, a: int, b: int, *, positivo_en_a: bool | None = None) -> bool:
    fa, fb = f(mpf(a)), f(mpf(b))
    if fa == 0 or fb == 0 or fa * fb > 0:
        return False
    if abs(fa) > 5000 or abs(fb) > 5000:
        return False
    if positivo_en_a is not None and (fa > 0) != positivo_en_a:
        return False
    return _cambios_de_signo(f, mpf(a), mpf(b)) == 1  # una sola raíz en el intervalo


def grafico(rng: random.Random) -> dict[str, Any]:
    for _ in range(MAX_INTENTOS):
        f = rng.choice(_FAMILIAS)(rng)
        a, b = -rng.randint(1, 4), rng.randint(1, 4)
        tabla = [f(mpf(x)) for x in range(a, b + 1)]
        if max(abs(v) for v in tabla) > 2000:
            continue
        # "El cambio de signo indica una raíz": la tabla debe mostrar al menos un cambio
        if any(tabla[i] * tabla[i + 1] < 0 for i in range(len(tabla) - 1)):
            return {"funcion": f.texto, "a": str(a), "b": str(b), "paso": "1", "decimales": 9}
    raise _fallo("grafico")


def bisectriz(rng: random.Random) -> dict[str, Any]:
    """a donde la función se comporta positiva y b donde negativa (Bisectriz, p.16): f(a) > 0 > f(b)."""
    for _ in range(MAX_INTENTOS):
        f = rng.choice(_FAMILIAS)(rng)
        a = rng.randint(-4, 3)
        b = a + rng.choice([1, 1, 2])
        if _con_cambio_unico(f, a, b, positivo_en_a=True):
            return {"funcion": f.texto, "a": str(a), "b": str(b), "tolerancia": "0.001", "decimales": 9}
    raise _fallo("bisectriz")


def _converge_falsa_posicion(f: _Funcion, a: int, b: int, tol: mpf = mpf("0.001"), maximo: int = 60) -> bool:
    """b es el punto fijo y a se desplaza hacia la raíz; Є = |x_{i+1} − x_i| debe llegar a la tolerancia."""
    aa, fb, anterior = mpf(a), f(mpf(b)), None
    for _ in range(maximo):
        fa = f(aa)
        if fa == fb:
            return False
        x = mpf(b) - fb * (aa - mpf(b)) / (fa - fb)
        if anterior is not None and abs(x - anterior) <= tol:
            return True
        anterior, aa = x, x
    return False


def falsa_posicion(rng: random.Random) -> dict[str, Any]:
    for _ in range(MAX_INTENTOS):
        f = rng.choice(_FAMILIAS)(rng)
        a = rng.randint(-4, 3)
        b = a + rng.choice([1, 1, 2])
        if _con_cambio_unico(f, a, b) and _converge_falsa_posicion(f, a, b):
            return {"funcion": f.texto, "a": str(a), "b": str(b), "tolerancia": "0.001", "decimales": 9}
    raise _fallo("falsa-posicion")


def _simular_newton(f: _Funcion, x0: mpf, tol: mpf, maximo: int = 30) -> tuple[bool, mpf]:
    x = x0
    for _ in range(maximo):
        try:
            fx, dfx = f(x), mpmath.diff(f.f, x)
        except (ZeroDivisionError, ValueError, OverflowError):
            return False, x
        if abs(dfx) < mpf("0.05"):
            return False, x
        nuevo = x - fx / dfx
        if abs(nuevo) > 50:
            return False, x
        if abs(nuevo - x) <= tol:
            return True, nuevo
        x = nuevo
    return False, x


def newton_raphson(rng: random.Random) -> dict[str, Any]:
    for _ in range(MAX_INTENTOS):
        f = rng.choice(_FAMILIAS)(rng)
        x0 = rng.randint(-3, 4)
        ok, raiz = _simular_newton(f, mpf(x0), mpf("1e-6"))
        if ok and abs(f(mpf(x0))) > mpf("0.001") and abs(raiz) <= 10:
            datos: dict[str, Any] = {"funcion": f.texto, "derivada": f.derivada, "x0": str(x0),
                                     "tolerancia": "0.000001", "decimales": 9}
            return datos
    raise _fallo("newton-raphson")


def secante(rng: random.Random) -> dict[str, Any]:
    for _ in range(MAX_INTENTOS):
        f = rng.choice(_FAMILIAS)(rng)
        x0 = rng.randint(-3, 3)
        x1 = x0 + rng.choice([1, 1, 2])
        ant, act = mpf(x0), mpf(x1)
        ok = False
        try:
            for _i in range(25):
                den = f(act) - f(ant)
                if abs(den) < mpf("1e-12"):
                    break
                nuevo = act - f(act) * (act - ant) / den
                if abs(nuevo) > 50:
                    break
                if abs(nuevo - act) <= mpf("0.001"):
                    ok = abs(nuevo) <= 10
                    break
                ant, act = act, nuevo
        except (ZeroDivisionError, ValueError, OverflowError):
            ok = False
        if ok and f(mpf(x0)) != f(mpf(x1)):
            return {"funcion": f.texto, "x0": str(x0), "x1": str(x1), "tolerancia": "0.001", "decimales": 9}
    raise _fallo("secante")


def punto_fijo(rng: random.Random) -> dict[str, Any]:
    """x = g(x) con |g'(x)| < 1 cerca de la raíz (condición de convergencia) y x_0 de "exploración"."""
    for _ in range(MAX_INTENTOS):
        familia = rng.choice(["exp", "exp_menos", "raiz"])
        if familia == "exp":  # p.18: g(x) = (e^x − 2)/2 para f(x) = 2x − e^x + 2
            m, k = rng.choice([(2, 2), (3, 3), (3, 2), (4, 3), (4, 4), (5, 4), (5, 3), (2, 3), (3, 4)])
            g_txt, f_txt = f"(e^x - {k})/{m}", f"{m}x - e^x + {k}"
            g = lambda x, m=m, k=k: (mpmath.exp(x) - k) / m  # noqa: E731
            x0 = 0
        elif familia == "exp_menos":  # p.17: x = e^{-x}
            c = rng.choice(["1", "1", "0.5", "0.6", "0.8", "0.9", "1.2", "1.5"])
            g_txt = "e^(-x)" if c == "1" else f"e^(-{c}x)"
            f_txt = f"{g_txt} - x"
            cc = mpf(c)
            g = lambda x, cc=cc: mpmath.exp(-cc * x)  # noqa: E731
            x0 = rng.choice([0, 0, 1])
        else:  # 2x² − x − 5 = 0  ->  x = √((x + 5)/2)
            a, c = rng.choice([1, 2, 3]), rng.randint(2, 9)
            g_txt, f_txt = f"sqrt((x + {c})/{a})", f"{_coef(a)}x^2 - x - {c}"
            g = lambda x, a=a, c=c: mpmath.sqrt((x + c) / a)  # noqa: E731
            x0 = rng.choice([1, 2, 3])
        x, convergio, e = mpf(x0), False, mpf(1)
        try:
            for _i in range(70):
                nuevo = g(x)
                e = abs(nuevo - x)
                x = nuevo
                if e <= mpf("1e-5"):
                    convergio = True
                    break
        except (ZeroDivisionError, ValueError, OverflowError):
            continue
        if convergio and abs(mpmath.diff(g, x)) < mpf("0.9") and abs(x) < 20:
            return {"funcion": g_txt, "x0": str(x0), "tolerancia": "0.00001", "f": f_txt, "decimales": 9}
    raise _fallo("punto-fijo")


# --------------------------------------------------------------------------------------------
# Unidad II · 3 Ecuaciones lineales
# --------------------------------------------------------------------------------------------
def _det(m: list[list[Fraction]]) -> Fraction:
    n = len(m)
    if n == 1:
        return m[0][0]
    return sum(((-1) ** j * m[0][j] * _det([fila[:j] + fila[j + 1:] for fila in m[1:]])
                for j in range(n)), Fraction(0))


def _menores_principales(a: list[list[int]]) -> list[Fraction]:
    return [_det([[Fraction(v) for v in fila[:k]] for fila in a[:k]]) for k in range(1, len(a) + 1)]


def _sistema_directo(rng: random.Random, variables: list[str]) -> dict[str, Any]:
    """Sistema 3×3 con solución única y pivotes no nulos (sin intercambiar renglones), como los del libro."""
    nz = [c for c in range(-7, 8) if c != 0]
    for _ in range(MAX_INTENTOS):
        a = [[rng.choice(nz) for _j in range(3)] for _i in range(3)]
        b = [rng.randint(-9, 9) for _i in range(3)]
        if not any(b):
            continue
        menores = _menores_principales(a)
        det = menores[-1]
        if all(m != 0 for m in menores) and 3 <= abs(det) <= 250:
            return {"matriz": [[str(v) for v in a[i]] + [str(b[i])] for i in range(3)],
                    "variables": variables, "decimales": 9}
    raise _fallo("sistema directo")


def montante(rng: random.Random) -> dict[str, Any]:
    return _sistema_directo(rng, ["a", "b", "c"])


def gauss_jordan(rng: random.Random) -> dict[str, Any]:
    return _sistema_directo(rng, ["a", "b", "c"])


def eliminacion_gaussiana(rng: random.Random) -> dict[str, Any]:
    return _sistema_directo(rng, ["x₁", "x₂", "x₃"])


def es_diagonal_dominante(matriz: list[list[str]]) -> bool:
    """|a_ii| > Σ_{j≠i} |a_ij| en cada renglón (la matriz aumentada trae b en la última columna)."""
    n = len(matriz)
    for i in range(n):
        fila = [Fraction(v) for v in matriz[i][:n]]
        if abs(fila[i]) <= sum((abs(fila[j]) for j in range(n) if j != i), Fraction(0)):
            return False
    return True


def _sistema_iterativo(rng: random.Random) -> dict[str, Any]:
    """Gauss – Seidel y Jacobi: ejemplo MC con diagonal dominante (3a − 0.1b − 0.2c = 7.85, ...).

    Se construye con |a_ii| > Σ|a_ij| y la suma ≤ 70 % de la diagonal (converge en pocas iteraciones).
    A veces se desordenan los renglones para practicar el "Analizar la Diagonal Dominante" del libro
    (p.37): el sistema SIEMPRE puede reordenarse para quedar dominante.
    """
    for _ in range(MAX_INTENTOS):
        decimales = rng.random() < 0.5
        diag = [rng.randint(3, 10) for _i in range(3)]
        a: list[list[Fraction]] = []
        for i in range(3):
            fila = [Fraction(0)] * 3
            fila[i] = Fraction(diag[i])
            for j in range(3):
                if j != i:
                    mag = Fraction(rng.randint(1, 5), 10) if decimales else Fraction(rng.randint(1, 3))
                    fila[j] = mag * rng.choice([-1, 1])
            a.append(fila)
        if any(sum(abs(a[i][j]) for j in range(3) if j != i) > Fraction(7, 10) * a[i][i] for i in range(3)):
            continue
        solucion = [Fraction(rng.randint(-6, 18), 2) for _i in range(3)]  # enteros o medios (como −2.5 del libro)
        if not any(solucion):
            continue
        b = [sum(a[i][j] * solucion[j] for j in range(3)) for i in range(3)]
        filas = [[_txt(v) for v in a[i]] + [_txt(b[i])] for i in range(3)]
        if rng.random() < 0.35:
            rng.shuffle(filas)
        nombres = rng.choice([["x", "y", "z"], ["a", "b", "c"]])
        return {"matriz": filas, "variables": nombres, "tolerancia": "0.001", "decimales": 9}
    raise _fallo("sistema iterativo")


def gauss_seidel(rng: random.Random) -> dict[str, Any]:
    return _sistema_iterativo(rng)


def jacobi(rng: random.Random) -> dict[str, Any]:
    return _sistema_iterativo(rng)


def raices_polinomios(rng: random.Random) -> dict[str, Any]:
    """Polinomio mónico con coeficientes enteros: se hallan raíces con los divisores del término
    independiente, División Sintética y la fórmula general (ej. x² + x − 6)."""
    nz = [r for r in range(-6, 7) if r != 0]
    for _ in range(MAX_INTENTOS):
        modo = rng.choice(["grado2", "grado3", "grado3_cuadratica"])
        if modo == "grado2":
            r1, r2 = rng.sample(nz, 2)
            coefs = [1, -(r1 + r2), r1 * r2]
        elif modo == "grado3":
            r1, r2, r3 = rng.sample(nz, 3)
            coefs = [1, -(r1 + r2 + r3), r1 * r2 + r1 * r3 + r2 * r3, -r1 * r2 * r3]
        else:  # una raíz entera y un cuadrático con raíces reales (fórmula general)
            r = rng.choice(nz)
            b, c = rng.randint(-5, 5), rng.randint(-6, 3)
            if b * b - 4 * c <= 0:
                continue
            coefs = [1, b - r, c - r * b, -r * c]
        if coefs[-1] == 0 or abs(coefs[-1]) > 60:
            continue
        return {"coeficientes": [str(c) for c in coefs], "decimales": 9}
    raise _fallo("raices-polinomios")


# --------------------------------------------------------------------------------------------
# Unidad II · 4 Mínimos cuadrados
# --------------------------------------------------------------------------------------------
# función(x) -> (texto del libro, evaluación, x máximo, ¿x permitido?)  (sin polos cerca de los datos)
def _lejos_de(x: Fraction, polos: Callable[[int], float], holgura: float = 0.3) -> bool:
    return all(abs(float(x) - polos(k)) > holgura for k in range(0, 6))


_FUNCIONES_AJUSTE: dict[str, tuple[Callable[[mpf], mpf], float, Callable[[Fraction], bool]]] = {
    "sen(x)": (mpmath.sin, 11.0, lambda x: True),
    "cos(x)": (mpmath.cos, 11.0, lambda x: True),
    "tg(x)": (mpmath.tan, 11.0, lambda x: _lejos_de(x, lambda k: math.pi / 2 + k * math.pi)),
    "ctg(x)": (mpmath.cot, 11.0, lambda x: _lejos_de(x, lambda k: k * math.pi)),
    "Ln(x)": (mpmath.log, 11.0, lambda x: x > 0),
    "e^x": (mpmath.exp, 4.5, lambda x: True),
}


def _datos_ajuste(rng: random.Random, n_rango: tuple[int, int], columnas: Callable[[mpf], list[mpf]],
                  *, x_maximo: float = 11.0, permitido: Callable[[Fraction], bool] = lambda x: True,
                  curvatura: bool = False) -> tuple[list[str], list[str]]:
    """x crecientes con un decimal y y con "errores sustanciales" (ruido) alrededor de una tendencia.

    Se exige que el sistema de ecuaciones normales tenga solución única (columnas independientes).
    """
    for _ in range(MAX_INTENTOS):
        n = rng.randint(*n_rango)
        x = _dec(rng, 1, 2.5)
        paso_max = min(3.0, (x_maximo - float(x)) / (n - 1))
        if paso_max < 0.3:
            continue
        xs = [x]
        for _i in range(n - 1):
            xs.append(xs[-1] + _dec(rng, 0.3, paso_max))
        if float(xs[-1]) > x_maximo or not all(permitido(v) for v in xs):
            continue
        pendiente = Fraction(rng.randint(4, 9), 10)
        base = Fraction(rng.randint(12, 25), 10)
        ys = []
        for v in xs:
            tendencia = base + pendiente * (v - xs[0]) - (Fraction(rng.randint(1, 4), 100) * (v - xs[0]) ** 2 if curvatura else 0)
            ys.append(max(Fraction(5, 10), round((tendencia + _dec(rng, -0.6, 0.6)) * 10) / Fraction(10)))
        filas = [columnas(_a_mpf(v)) for v in xs]
        m = len(filas[0])
        normal = mpmath.matrix(m, m)
        for i in range(m):
            for j in range(m):
                normal[i, j] = sum(f[i] * f[j] for f in filas)
        hadamard = abs(mpmath.det(normal)) / mpmath.fprod(normal[i, i] for i in range(m))
        if hadamard < mpf("1e-9"):
            continue
        if max(abs(float(c)) for f in filas for c in f) > 5e3:
            continue
        return [_txt(v) for v in xs], [_txt(v) for v in ys]
    raise _fallo("mínimos cuadrados")


def _polinomial(grado: int) -> Callable[[mpf], list[mpf]]:
    return lambda x: [x**k for k in range(grado + 1)]


def linea_recta(rng: random.Random) -> dict[str, Any]:  # p.46: n = 6 datos
    x, y = _datos_ajuste(rng, (4, 7), _polinomial(1))
    return {"x": x, "y": y, "decimales": 9}


def cuadratica(rng: random.Random) -> dict[str, Any]:
    x, y = _datos_ajuste(rng, (5, 7), _polinomial(2), curvatura=True)
    return {"x": x, "y": y, "decimales": 9}


def cubica(rng: random.Random) -> dict[str, Any]:
    x, y = _datos_ajuste(rng, (6, 8), _polinomial(3), curvatura=True)
    return {"x": x, "y": y, "decimales": 9}


def _con_funcion(rng: random.Random, grado: int, n_rango: tuple[int, int]) -> dict[str, Any]:
    texto = rng.choice(list(_FUNCIONES_AJUSTE))
    f, x_maximo, permitido = _FUNCIONES_AJUSTE[texto]
    # g(x) = a0 + a1 x [+ a2 x²] + a_k f(x)
    columnas = lambda x: [x**k for k in range(grado + 1)] + [f(x)]  # noqa: E731
    x, y = _datos_ajuste(rng, n_rango, columnas, x_maximo=x_maximo, permitido=permitido)
    return {"x": x, "y": y, "funcion": texto, "decimales": 9}


def lineal_con_funcion(rng: random.Random) -> dict[str, Any]:  # AcF: tablas con ctg x / tg x (4 datos)
    return _con_funcion(rng, 1, (4, 6))


def cuadratica_con_funcion(rng: random.Random) -> dict[str, Any]:
    return _con_funcion(rng, 2, (5, 6))


# --------------------------------------------------------------------------------------------
# Unidad III · 5 Integración
# --------------------------------------------------------------------------------------------
_INTEGRANDOS: list[tuple[str, list[tuple[int, int]]]] = [
    ("1/(1+x^2)", [(0, 1), (1, 2), (2, 3), (0, 2), (-1, 1), (-2, 2), (1, 3)]),
    ("1 - x^2", [(0, 1), (0, 2), (1, 2), (-1, 1)]),
    ("x^3 e^x", [(0, 1), (1, 2), (0, 2)]),
    ("3x^3 - 10", [(-2, 2), (0, 2), (1, 3), (-1, 1), (0, 1)]),
    ("sen(2x) + 3x^3", [(0, 1), (1, 2), (0, 2)]),   # AcF OR: ∫₀¹ [sen(2x) + 3x³] dx
    ("cos(2x) + x^2", [(1, 2), (0, 1), (2, 3)]),    # AcF OR: ∫₁² [cos(2x) + x²] dx
    ("x^2 + 1", [(0, 1), (1, 2), (-1, 1), (0, 2)]),
    ("e^x", [(0, 1), (1, 2), (0, 2)]),
]


def _integral(rng: random.Random, n: Callable[[], int]) -> dict[str, Any]:
    if rng.random() < 0.25:  # polinomio k x³ − m (como 3x³ − 10)
        k, m = rng.randint(2, 4), rng.randint(5, 12)
        funcion, (a, b) = f"{k}x^3 - {m}", rng.choice([(-2, 2), (0, 2), (1, 3), (-1, 1)])
    else:
        funcion, intervalos = rng.choice(_INTEGRANDOS)
        a, b = rng.choice(intervalos)
    return {"funcion": funcion, "a": str(a), "b": str(b), "n": n(), "decimales": 9}  # a < b siempre


def trapezoidal(rng: random.Random) -> dict[str, Any]:
    return _integral(rng, lambda: rng.randint(2, 8))


def newton_cotes_cerradas(rng: random.Random) -> dict[str, Any]:
    return _integral(rng, lambda: rng.randint(2, 6))  # tabla del libro: n = 1…10


def newton_cotes_abiertas(rng: random.Random) -> dict[str, Any]:
    return _integral(rng, lambda: rng.randint(2, 6))  # tabla del libro: n = 1…6


def simpson_1_3(rng: random.Random) -> dict[str, Any]:
    return _integral(rng, lambda: rng.choice([2, 4, 6, 8, 10]))  # "n siempre par"


def simpson_3_8(rng: random.Random) -> dict[str, Any]:
    return _integral(rng, lambda: 3)  # este laboratorio solo acepta n = 3 (cuatro puntos, p.59)


def tablas_newton_cotes(rng: random.Random) -> dict[str, Any]:
    return {"tipo": rng.choice(["cerradas", "abiertas", "ambas"])}  # tablas fijas del libro: solo cambia la vista


# --------------------------------------------------------------------------------------------
# Unidad IV · 6 Ecuaciones diferenciales ordinarias
# --------------------------------------------------------------------------------------------
class _Edo:
    def __init__(self, texto: str, f: Callable[[mpf, mpf], mpf], y0: tuple[float, float]) -> None:
        self.texto, self.f, self.y0 = texto, f, y0  # y0: rango sugerido (mín, máx)


def _plantilla_edo(rng: random.Random) -> _Edo:
    tipo = rng.choice("ABCDEF")
    if tipo == "A":  # 3y' − 5yt + 1 = 0  ->  y' = (5yt − 1)/3
        a, b, c = rng.randint(2, 6), rng.randint(1, 3), rng.randint(2, 4)
        return _Edo(f"({a}yt - {b})/{c}", lambda y, t: (a * y * t - b) / c, (0.5, 3))
    if tipo == "B":  # 2y' + 3yt + y = 0  ->  y' = (−3yt − y)/2
        a, c = rng.randint(2, 4), rng.randint(2, 4)
        return _Edo(f"(-{a}yt - y)/{c}", lambda y, t: (-a * y * t - y) / c, (0.5, 3))
    if tipo == "C":  # y' − 2ty + 1 = 0  ->  y' = 2ty − 1
        a = rng.randint(1, 3)
        return _Edo(f"{_coef(a)}ty - 1", lambda y, t: a * t * y - 1, (0.5, 3))
    if tipo == "D":  # y' = (2yt + 1)/y²
        a, b = rng.randint(1, 3), rng.randint(1, 3)
        return _Edo(f"({_coef(a)}yt + {b})/y^2", lambda y, t: (a * y * t + b) / y**2, (0.6, 3))
    if tipo == "E":  # y' = (y + t)²/(1 − y), solo con y < 1
        return _Edo("(y + t)^2/(1 - y)", lambda y, t: (y + t) ** 2 / (1 - y), (0.1, 0.5))
    return _Edo("-y/(y^2 + t)", lambda y, t: -y / (y**2 + t), (0.5, 3))  # y' = −y/(y² + t)


def _estable_edo(f: Callable[[mpf, mpf], mpf], y0: mpf, h: mpf, pasos: int) -> bool:
    """Integra con RK4 y subpasos: f finita, sin singularidades cercanas y y acotada."""
    y, t, sub = y0, mpf(0), 20
    paso = h / sub
    try:
        for _ in range(pasos * sub):
            k1 = f(y, t)
            k2 = f(y + paso * k1 / 2, t + paso / 2)
            k3 = f(y + paso * k2 / 2, t + paso / 2)
            k4 = f(y + paso * k3, t + paso)
            y += paso * (k1 + 2 * k2 + 2 * k3 + k4) / 6
            t += paso
            if abs(y) > 40 or abs(f(y, t)) > 150:
                return False
    except (ZeroDivisionError, ValueError, OverflowError):
        return False
    return True


def _edo(rng: random.Random, *, arranque: str | None = None, pasos: tuple[int, int] = (1, 2)) -> dict[str, Any]:
    for _ in range(MAX_INTENTOS):
        e = _plantilla_edo(rng)
        y0 = _dec(rng, e.y0[0], e.y0[1])
        h = Fraction(rng.choice([1, 2, 2, 3, 3, 4, 5, 6]), 10) if rng.random() < 0.8 else Fraction(1, 4)
        n = rng.randint(*pasos)
        if not _estable_edo(e.f, _a_mpf(y0), _a_mpf(h), n):
            continue
        datos: dict[str, Any] = {"funcion": e.texto, "y0": _txt(y0), "h": _txt(h), "t0": "0",
                                 "pasos": n, "decimales": 9}
        if arranque == "igual_a_y0":
            datos["y_siguiente"] = _txt(y0)  # p.66: y_1 = y_0 dentro de f en el primer paso
        elif arranque == "omitido":
            datos["y_siguiente"] = None
        return datos
    raise _fallo("edo")


def euler_adelante(rng: random.Random) -> dict[str, Any]:
    return _edo(rng)


def euler_atras(rng: random.Random) -> dict[str, Any]:
    return _edo(rng, arranque="omitido")


def euler_modificado(rng: random.Random) -> dict[str, Any]:
    return _edo(rng, arranque="igual_a_y0")


def runge_kutta_2(rng: random.Random) -> dict[str, Any]:
    return _edo(rng)


def runge_kutta_3(rng: random.Random) -> dict[str, Any]:
    return _edo(rng)


def runge_kutta_4_simpson_1_3(rng: random.Random) -> dict[str, Any]:
    return _edo(rng)


def runge_kutta_4_simpson_3_8(rng: random.Random) -> dict[str, Any]:
    return _edo(rng)


def runge_kutta_orden_superior(rng: random.Random) -> dict[str, Any]:
    """y'' = f(V, U, q) con V = y', U = y, q = t. Ejemplo: 2Vq − U; AcF: y'' = y' sen(2t) − y cos(t)."""
    for _ in range(MAX_INTENTOS):
        tipo = rng.choice(["lineal", "lineal", "sen_cos", "tg"])
        if tipo == "lineal":
            a, b = rng.randint(1, 3), rng.randint(1, 3)
            signo = rng.choice(["+", "-"])
            texto = f"{_coef(a)}Vq {signo} {_coef(b)}U"
            s = 1 if signo == "+" else -1
            f = lambda v, u, q, a=a, b=b, s=s: a * v * q + s * b * u  # noqa: E731
        elif tipo == "sen_cos":
            texto, f = "V sen(2q) - U cos(q)", lambda v, u, q: v * mpmath.sin(2 * q) - u * mpmath.cos(q)
        else:
            texto, f = "V tg(q) - U", lambda v, u, q: v * mpmath.tan(q) - u
        y0, yp0 = _dec(rng, 1, 3), _dec(rng, 1, 3)
        h = Fraction(rng.choice([2, 3, 4, 5]), 10)
        n = rng.randint(1, 2)
        # sistema U' = V, V' = f: se integra con RK4 y subpasos para verificar que no diverge
        u, v, q, sub = _a_mpf(y0), _a_mpf(yp0), mpf(0), 20
        paso = _a_mpf(h) / sub
        bien = True
        try:
            for _i in range(n * sub):
                k1, m1 = v, f(v, u, q)
                k2, m2 = v + paso * m1 / 2, f(v + paso * m1 / 2, u + paso * k1 / 2, q + paso / 2)
                k3, m3 = v + paso * m2 / 2, f(v + paso * m2 / 2, u + paso * k2 / 2, q + paso / 2)
                k4, m4 = v + paso * m3, f(v + paso * m3, u + paso * k3, q + paso)
                u += paso * (k1 + 2 * k2 + 2 * k3 + k4) / 6
                v += paso * (m1 + 2 * m2 + 2 * m3 + m4) / 6
                q += paso
                if abs(u) > 60 or abs(v) > 60:
                    bien = False
                    break
        except (ZeroDivisionError, ValueError, OverflowError):
            bien = False
        if bien:
            return {"funcion": texto, "y0": _txt(y0), "yp0": _txt(yp0), "h": _txt(h), "q0": "0",
                    "pasos": n, "decimales": 9}
    raise _fallo("runge-kutta-orden-superior")


# --------------------------------------------------------------------------------------------
# Catálogo
# --------------------------------------------------------------------------------------------
GENERADORES: dict[str, Generador] = {
    "interpolacion-lineal": interpolacion_lineal,
    "newton-adelante": newton_adelante,
    "newton-atras": newton_atras,
    "diferencias-divididas": diferencias_divididas,
    "lagrange": lagrange,
    "grafico": grafico,
    "bisectriz": bisectriz,
    "punto-fijo": punto_fijo,
    "newton-raphson": newton_raphson,
    "falsa-posicion": falsa_posicion,
    "secante": secante,
    "montante": montante,
    "gauss-jordan": gauss_jordan,
    "eliminacion-gaussiana": eliminacion_gaussiana,
    "gauss-seidel": gauss_seidel,
    "jacobi": jacobi,
    "raices-polinomios": raices_polinomios,
    "linea-recta": linea_recta,
    "cuadratica": cuadratica,
    "cubica": cubica,
    "lineal-con-funcion": lineal_con_funcion,
    "cuadratica-con-funcion": cuadratica_con_funcion,
    "trapezoidal": trapezoidal,
    "newton-cotes-cerradas": newton_cotes_cerradas,
    "newton-cotes-abiertas": newton_cotes_abiertas,
    "tablas-newton-cotes": tablas_newton_cotes,
    "simpson-1-3": simpson_1_3,
    "simpson-3-8": simpson_3_8,
    "euler-adelante": euler_adelante,
    "euler-atras": euler_atras,
    "euler-modificado": euler_modificado,
    "runge-kutta-2": runge_kutta_2,
    "runge-kutta-3": runge_kutta_3,
    "runge-kutta-4-simpson-1-3": runge_kutta_4_simpson_1_3,
    "runge-kutta-4-simpson-3-8": runge_kutta_4_simpson_3_8,
    "runge-kutta-orden-superior": runge_kutta_orden_superior,
}


def generar_problema(slug: str, rng: random.Random | None = None) -> dict[str, Any]:
    """Problema aleatorio (entrada del método `slug`) que cumple las restricciones del libro."""
    try:
        generador = GENERADORES[slug]
    except KeyError as exc:
        raise ErrorMetodo(f"No hay generador de problemas para el método «{slug}»") from exc
    return generador(rng or random.Random())
