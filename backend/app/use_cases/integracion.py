"""Unidad III · 5 Integración (libro p.52–60).

Métodos: Regla Trapezoidal, Newton – Cotes Cerradas, Newton – Cotes Abiertas,
Regla de 1/3 de Simpson y Regla de 3/8 de Simpson. Variables y formato del libro.

El libro NO usa tablas de iteración: resuelve por sustitución renglón por renglón
(a y b → h en recuadro → α → I = ... con f(x=a), f(x=a+h)... → sustitución → suma → I en recuadro).
La tabla i | x_i | f(x_i) | coeficiente que se devuelve en `filas` es auxiliar para la UI.
No hay criterio de paro ni margen de error en el capítulo.
"""
import re
from collections.abc import Sequence
from fractions import Fraction
from typing import Literal

import mpmath
from mpmath import mpf

from app.domain.entities import Columna, Matriz, Paso, ResultadoNumerico, Serie
from app.domain.funciones import ErrorMetodo, FuncionUsuario
from app.use_cases._comun import DECIMALES_LIBRO, flt, fmt, muestrear, tex

# ---------------------------------------------------------------------------
# Tablas de Constantes para las fórmulas Cerradas y Abiertas de Newton – Cotes (p.57)
# n -> (α como (numerador, denominador) sin reducir, tal como lo imprime el libro; w_0 ... w_k)
# ---------------------------------------------------------------------------
TABLA_CERRADAS: dict[int, tuple[tuple[int, int], tuple[int, ...]]] = {
    1: ((1, 2), (1, 1)),
    2: ((1, 3), (1, 4, 1)),
    3: ((3, 8), (1, 3, 3, 1)),
    4: ((2, 45), (7, 32, 12, 32, 7)),
    5: ((5, 288), (19, 75, 50, 50, 75, 19)),
    6: ((1, 140), (41, 216, 27, 272, 27, 216, 41)),
    7: ((7, 17280), (751, 3577, 1323, 2989, 2989, 1323, 3577, 751)),
    # ERRATA corregida (decisión del usuario): el libro imprime α = 14/14175 y w_3 = w_5 = 10946.
    # Con esos valores α·Σw = 28.888... ≠ n = 8; los valores correctos son α = 4/14175 y 10496.
    8: ((4, 14175), (989, 5888, -928, 10496, -4540, 10496, -928, 5888, 989)),
    # ERRATA corregida: el libro imprime w_4 = w_5 = 5788; con 5778 se cumple α·Σw = n = 9.
    9: ((9, 89600), (2857, 15741, 1080, 19344, 5778, 5778, 19344, 1080, 15741, 2857)),
    10: ((5, 299376), (16067, 106300, -48525, 272400, -260550, 427368, -260550, 272400, -48525,
                       106300, 16067)),
}

TABLA_ABIERTAS: dict[int, tuple[tuple[int, int], tuple[int, ...]]] = {
    1: ((3, 2), (0, 1, 1, 0)),
    2: ((4, 3), (0, 2, -1, 2, 0)),
    3: ((5, 24), (0, 11, 1, 1, 11, 0)),
    4: ((6, 20), (0, 11, -14, 26, -14, 11, 0)),
    5: ((7, 1440), (0, 611, -453, 562, 562, -453, 611, 0)),
    6: ((8, 945), (0, 460, -954, 2196, -2459, 2196, -954, 460, 0)),
}

# Lo que imprime el libro en los renglones corregidos (para advertencias y documentación).
ERRATAS_CERRADAS: dict[int, str] = {
    8: "n = 8: el libro imprime α = 14/14175 y w_3 = w_5 = 10946; se usan α = 4/14175 y "
       "w_3 = w_5 = 10496 (con lo impreso α·Σw ≠ n).",
    9: "n = 9: el libro imprime w_4 = w_5 = 5788; se usa w_4 = w_5 = 5778 (con lo impreso α·Σw ≠ n).",
}

TITULO_CERRADAS = "Constantes para las fórmulas Cerradas de Newton – Cotes"
TITULO_ABIERTAS = "Constantes para las fórmulas Abiertas de Newton – Cotes"


def verificar_tablas() -> list[str]:
    """Verificación interna: α·Σw = n (cerradas) y α·Σw = n + 2 (abiertas). Devuelve los renglones que fallan."""
    fallas: list[str] = []
    for n, ((p, q), w) in TABLA_CERRADAS.items():
        if len(w) != n + 1 or Fraction(p, q) * sum(w) != n:
            fallas.append(f"cerradas n={n}")
    for n, ((p, q), w) in TABLA_ABIERTAS.items():
        if len(w) != n + 3 or Fraction(p, q) * sum(w) != n + 2 or w[0] != 0 or w[-1] != 0:
            fallas.append(f"abiertas n={n}")
    return fallas


# ---------------------------------------------------------------------------
# Utilidades de formato
# ---------------------------------------------------------------------------
_X = re.compile(r"(?<![\\A-Za-z])x(?![A-Za-z])")


def _a_mpf(valor: Fraction) -> mpf:
    return mpf(valor.numerator) / valor.denominator


def _fr(valor: Fraction) -> str:
    """Fracción como la escribe el libro en línea: 9/4, -4/3, 2."""
    return str(valor.numerator) if valor.denominator == 1 else f"{valor.numerator}/{valor.denominator}"


def _frac_tex(valor: Fraction) -> str:
    if valor.denominator == 1:
        return str(valor.numerator)
    signo = "-" if valor < 0 else ""
    return rf"{signo}\frac{{{abs(valor.numerator)}}}{{{valor.denominator}}}"


def _sustituir(latex: str, valor: str) -> str:
    """Sustituye x por (valor) en la expresión LaTeX de f(x)."""
    return _X.sub(lambda _: f"({valor})", latex)


def _evaluar(funcion: FuncionUsuario, x: mpf) -> mpf:
    y = funcion(x)
    if isinstance(y, mpmath.mpc) or not mpmath.isfinite(y):
        raise ErrorMetodo(f"f(x) = {funcion.texto} no está definida (o no es real) en x = {fmt(x)}")
    return mpf(y)


def _cuerpo(terminos: Sequence[str], pesos: Sequence[int], estilo: str, multiplicado: bool) -> str:
    """Arma lo que va dentro de las llaves de I = ... según el formato del libro.

    - "agrupado" (Trapezoidal, 3/8 de Simpson): f(a) + k[ f(a+h) + ... ] + f(b)
    - "simpson" (1/3 de Simpson):  f(a) + 4f(a+h) + 2f(a+2h) + ... + f(b)
    - "ponderado" (Newton – Cotes): (w_0) f(a) + (w_1) f(a+h) + ...
    `multiplicado` indica si el término es una expresión sustituida (va entre paréntesis).
    """
    def envolver(t: str) -> str:
        return rf"\left({t}\right)" if multiplicado else t

    if estilo == "agrupado":
        k = pesos[1] if len(pesos) > 2 else 1
        if len(terminos) == 2:
            return f"{terminos[0]} + {terminos[1]}"
        interior = " + ".join(terminos[1:-1])
        return rf"{terminos[0]} + {k}\left[{interior}\right] + {terminos[-1]}"
    if estilo == "simpson":
        partes = []
        for t, w in zip(terminos, pesos):
            partes.append(t if w == 1 else f"{w}{envolver(t)}")
        return " + ".join(partes)
    # ponderado
    return " + ".join(rf"({w})\,{envolver(t)}" for t, w in zip(terminos, pesos))


# ---------------------------------------------------------------------------
# Motor común de sustitución
# ---------------------------------------------------------------------------
def _resolver(
    *,
    metodo: str,
    nombre_libro: str,
    pagina: int,
    funcion: FuncionUsuario,
    a: mpf,
    b: mpf,
    n: int,
    divisor: int,  # h = (b - a) / divisor
    divisor_tex: str,  # "n" o "n + 2"
    pesos: Sequence[int],
    factor: Fraction,  # I = factor · h · Σ pesos_i f(a + ih)
    factor_tex: str,  # factor delante de h; "H" = h en línea (1/4), "HT" = h como fracción
    estilo: Literal["agrupado", "simpson", "ponderado"],
    alfa: tuple[int, int] | None,
    columna_peso: str,
    exactos: tuple[Fraction, Fraction] | None,
    decimales: int,
) -> ResultadoNumerico:
    if not b > a:
        raise ErrorMetodo("Se requiere a < b (h = (b − a)/n siempre positivo, como indica el libro)")
    d = decimales
    r = ResultadoNumerico(metodo=metodo, nombre_libro=nombre_libro, pagina=pagina)

    # (1) a y b
    a_txt = _fr(exactos[0]) if exactos else fmt(a, d)
    b_txt = _fr(exactos[1]) if exactos else fmt(b, d)
    r.pasos.append(Paso("Solución", rf"a = {a_txt}\;\text{{y}}\;b = {b_txt},\quad n = {n}"))

    # (2) h en recuadro
    if exactos:
        h_fr = (exactos[1] - exactos[0]) / divisor
        h = _a_mpf(h_fr)
        h_txt, h_tex, h_res = _fr(h_fr), _frac_tex(h_fr), _fr(h_fr)
    else:
        h_fr = None
        h = (b - a) / divisor
        h_txt = h_tex = fmt(h, d)
        h_res = fmt(h, d)
    resta = f"({a_txt})" if a < 0 else a_txt  # 2 − (−2) como en el libro
    r.pasos.append(
        Paso(
            "Ancho h",
            rf"h = \frac{{b - a}}{{{divisor_tex}}} = \frac{{{b_txt} - {resta}}}"
            rf"{{{divisor_tex.replace('n', str(n))}}} = {h_tex} \qquad \boxed{{h = {h_tex}}}",
        )
    )

    # (3) α (Newton – Cotes)
    if alfa is not None:
        r.pasos.append(Paso("Constante α (tabla p.57)", rf"\boxed{{\alpha = \frac{{{alfa[0]}}}{{{alfa[1]}}}}}"))

    # Nodos x = a + ih
    nodos_fr = [exactos[0] + i * h_fr for i in range(len(pesos))] if exactos and h_fr is not None else None
    xs = [_a_mpf(v) for v in nodos_fr] if nodos_fr else [a + i * h for i in range(len(pesos))]
    xs[-1] = b  # el último nodo es exactamente b
    etiquetas = [_fr(v) for v in nodos_fr] if nodos_fr else [fmt(x, d) for x in xs]

    ys: list[mpf | None] = []
    for x, w in zip(xs, pesos):
        try:
            ys.append(_evaluar(funcion, x))
        except ErrorMetodo:
            if w != 0:
                raise
            ys.append(None)  # extremo con peso 0 (abiertas): no se necesita f(x)
            r.advertencias.append(f"f(x) no está definida en x = {fmt(x, d)}; su peso es 0 y no afecta a I.")

    suma = sum((mpf(w) * y for w, y in zip(pesos, ys) if w != 0 and y is not None), mpf(0))
    integral = _a_mpf(factor) * h * suma

    # (4) I = ... con f(x = a), f(x = a + h), ...
    delante = factor_tex.replace("HT", h_tex).replace("H", h_txt)
    simbolico = [f"f(x = {e})" for e in etiquetas]
    r.pasos.append(Paso("Fórmula", rf"I = {delante}\left\{{{_cuerpo(simbolico, pesos, estilo, False)}\right\}}"))

    # (5) Sustitución en f(x)
    sustituidos = [_sustituir(funcion.latex, e) for e in etiquetas]
    r.pasos.append(
        Paso("Sustituyendo en f(x)", rf"I = {delante}\left\{{{_cuerpo(sustituidos, pesos, estilo, True)}\right\}}")
    )
    valores = [
        tex(mpf(w) * y, d) for w, y in zip(pesos, ys) if w != 0 and y is not None
    ]
    if exactos and h_fr is not None:
        fh_txt = _fr(factor * h_fr)
    else:
        fh_txt = fmt(_a_mpf(factor) * h, d)
    r.pasos.append(Paso("Evaluando", rf"I = ({fh_txt})\left\{{{' + '.join(valores)}\right\}}"))

    # (6) Suma
    r.pasos.append(Paso("Sumando", rf"I = ({fh_txt})\left({fmt(suma, d)}\right)"))

    # (7) I en recuadro
    r.pasos.append(Paso("Resultado", rf"\boxed{{I = {fmt(integral, d)}}}"))

    # Tabla auxiliar para la UI
    r.columnas = [
        Columna("i", "i"),
        Columna("x", r"x_i = a + ih"),
        Columna("fx", r"f(x_i)"),
        Columna("w", columna_peso),
    ]
    for i, (x, y, w, e) in enumerate(zip(xs, ys, pesos, etiquetas)):
        r.filas.append({"i": str(i), "x": e, "fx": fmt(y, d) if y is not None else None, "w": str(w)})

    r.resultado["h"] = h_res
    if alfa is not None:
        r.resultado["α"] = f"{alfa[0]}/{alfa[1]}"
    r.resultado["I"] = fmt(integral, d)

    r.series.append(Serie(f"f(x) = {funcion.texto}", "linea", muestrear(funcion, a, b)))
    r.series.append(
        Serie("Nodos (x_i, f(x_i))", "puntos", [(flt(x), flt(y)) for x, y in zip(xs, ys) if y is not None])
    )
    return r


# ---------------------------------------------------------------------------
# Métodos del libro
# ---------------------------------------------------------------------------
def regla_trapezoidal(
    funcion: FuncionUsuario,
    a: mpf,
    b: mpf,
    n: int,
    exactos: tuple[Fraction, Fraction] | None = None,
    decimales: int = DECIMALES_LIBRO,
) -> ResultadoNumerico:
    """Regla Trapezoidal (p.53–54).

    I = (h/2)[f(a) + 2Σ f(a + ih) + f(b)],  h = (b − a)/n
    El libro imprime la Σ de i = 1 hasta n y "n siempre impar", pero su ejemplo (p.54) usa n = 4 y
    suma i = 1..3 (f(x=9/4), f(x=5/2), f(x=11/4)). Se sigue el ejemplo: Σ de i = 1 a n − 1 y
    no se restringe la paridad de n.
    """
    if n < 1:
        raise ErrorMetodo("n debe ser un entero positivo")
    pesos = [1] + [2] * (n - 1) + [1]
    return _resolver(
        metodo="trapezoidal", nombre_libro="Regla Trapezoidal", pagina=53, funcion=funcion, a=a, b=b, n=n,
        divisor=n, divisor_tex="n", pesos=pesos, factor=Fraction(1, 2), factor_tex=r"\frac{H}{2}",
        estilo="agrupado", alfa=None, columna_peso=r"\text{Coeficiente}", exactos=exactos, decimales=decimales,
    )


def newton_cotes_cerradas(
    funcion: FuncionUsuario,
    a: mpf,
    b: mpf,
    n: int,
    exactos: tuple[Fraction, Fraction] | None = None,
    decimales: int = DECIMALES_LIBRO,
) -> ResultadoNumerico:
    """Newton – Cotes Cerradas (p.55–56): I = αh Σ_{i=0}^{n} w_i f(a + ih),  h = (b − a)/n."""
    if n not in TABLA_CERRADAS:
        raise ErrorMetodo("Newton – Cotes Cerradas: la tabla del libro (p.57) solo tiene n = 1 a 10")
    (p, q), w = TABLA_CERRADAS[n]
    r = _resolver(
        metodo="newton-cotes-cerradas", nombre_libro="Newton – Cotes Cerradas", pagina=55, funcion=funcion,
        a=a, b=b, n=n, divisor=n, divisor_tex="n", pesos=w, factor=Fraction(p, q),
        factor_tex=rf"\left(\frac{{{p}}}{{{q}}}\right)\left(HT\right)", estilo="ponderado", alfa=(p, q),
        columna_peso="w_i", exactos=exactos, decimales=decimales,
    )
    if n in ERRATAS_CERRADAS:
        r.advertencias.append("Renglón corregido de la tabla del libro. " + ERRATAS_CERRADAS[n])
    return r


def newton_cotes_abiertas(
    funcion: FuncionUsuario,
    a: mpf,
    b: mpf,
    n: int,
    exactos: tuple[Fraction, Fraction] | None = None,
    decimales: int = DECIMALES_LIBRO,
) -> ResultadoNumerico:
    """Newton – Cotes Abiertas (p.55–56): I = αh Σ_{i=0}^{n+2} w_i f(a + ih),  h = (b − a)/(n + 2).

    Los extremos f(a) y f(b) llevan peso w = 0 (ver tabla p.57).
    """
    if n not in TABLA_ABIERTAS:
        raise ErrorMetodo("Newton – Cotes Abiertas: la tabla del libro (p.57) solo tiene n = 1 a 6")
    (p, q), w = TABLA_ABIERTAS[n]
    return _resolver(
        metodo="newton-cotes-abiertas", nombre_libro="Newton – Cotes Abiertas", pagina=55, funcion=funcion,
        a=a, b=b, n=n, divisor=n + 2, divisor_tex="n + 2", pesos=w, factor=Fraction(p, q),
        factor_tex=rf"\left(\frac{{{p}}}{{{q}}}\right)\left(HT\right)", estilo="ponderado", alfa=(p, q),
        columna_peso="w_i", exactos=exactos, decimales=decimales,
    )


def simpson_1_3(
    funcion: FuncionUsuario,
    a: mpf,
    b: mpf,
    n: int,
    exactos: tuple[Fraction, Fraction] | None = None,
    decimales: int = DECIMALES_LIBRO,
) -> ResultadoNumerico:
    """Regla de 1/3 de Simpson (p.58).

    I = (h/3)[f(a) + 4Σ_{i=1}^{n−1} f(a + ih) + 2Σ_{i=2}^{n−2} f(a + ih) + f(b)],  h = (b − a)/n
    (4 para i impar, 2 para i par). n siempre par.
    """
    if n < 2 or n % 2 != 0:
        raise ErrorMetodo("Regla de 1/3 de Simpson: n siempre par (libro p.58)")
    pesos = [1] + [4 if i % 2 else 2 for i in range(1, n)] + [1]
    return _resolver(
        metodo="simpson-1-3", nombre_libro="Regla de 1/3 de Simpson", pagina=58, funcion=funcion, a=a, b=b,
        n=n, divisor=n, divisor_tex="n", pesos=pesos, factor=Fraction(1, 3), factor_tex=r"\frac{H}{3}",
        estilo="simpson", alfa=None, columna_peso=r"\text{Coeficiente}", exactos=exactos, decimales=decimales,
    )


def simpson_3_8(
    funcion: FuncionUsuario,
    a: mpf,
    b: mpf,
    n: int,
    exactos: tuple[Fraction, Fraction] | None = None,
    decimales: int = DECIMALES_LIBRO,
) -> ResultadoNumerico:
    """Regla de 3/8 de Simpson (p.59): I = (3/8)h[f(a) + 3Σ_{i=1}^{n−1} f(a + ih) + f(b)],  h = (b − a)/n.

    Decisión del usuario: solo n = 3 (cuatro puntos, como el ejemplo del libro).
    """
    if n != 3:
        raise ErrorMetodo("Regla de 3/8 de Simpson: este laboratorio solo acepta n = 3 (cuatro puntos, libro p.59)")
    return _resolver(
        metodo="simpson-3-8", nombre_libro="Regla de 3/8 de Simpson", pagina=59, funcion=funcion, a=a, b=b,
        n=n, divisor=n, divisor_tex="n", pesos=[1, 3, 3, 1], factor=Fraction(3, 8),
        factor_tex=r"\left(\frac{3}{8}\right)\left(HT\right)", estilo="agrupado", alfa=None,
        columna_peso=r"\text{Coeficiente}", exactos=exactos, decimales=decimales,
    )


def tablas_newton_cotes(tipo: Literal["cerradas", "abiertas", "ambas"] = "ambas") -> ResultadoNumerico:
    """Tablas de Constantes para las fórmulas Cerradas y Abiertas de Newton – Cotes (p.57)."""
    r = ResultadoNumerico(
        metodo="tablas-newton-cotes",
        nombre_libro="Tablas de Constantes para las fórmulas Cerradas y Abiertas de Newton – Cotes",
        pagina=57,
    )

    def tabla(datos: dict[int, tuple[tuple[int, int], tuple[int, ...]]], titulo: str, columnas: int) -> Matriz:
        filas = [["n", "α"] + [f"i = {i}" for i in range(columnas)]]
        for n, ((p, q), w) in datos.items():
            celdas = [str(v) for v in w] + [""] * (columnas - len(w))
            filas.append([str(n), f"{p}/{q}"] + celdas)
        return Matriz(titulo=titulo, filas=filas, nota="El primer renglón son los encabezados de la tabla")

    if tipo in ("cerradas", "ambas"):
        r.pasos.append(Paso("Newton – Cotes (Cerradas)",
                            r"I = \alpha h \sum_{i=0}^{n} w_i\, f(a + ih), \qquad h = \frac{b - a}{n}"))
        r.matrices.append(tabla(TABLA_CERRADAS, TITULO_CERRADAS, 11))
        r.advertencias.extend("Renglón corregido de la tabla del libro. " + t for t in ERRATAS_CERRADAS.values())
    if tipo in ("abiertas", "ambas"):
        r.pasos.append(Paso("Newton – Cotes (Abiertas)",
                            r"I = \alpha h \sum_{i=0}^{n+2} w_i\, f(a + ih), \qquad h = \frac{b - a}{n + 2}"))
        r.matrices.append(tabla(TABLA_ABIERTAS, TITULO_ABIERTAS, 9))
    r.resultado["tipo"] = tipo
    return r
