"""Unidad I · 2 Solución de Ecuaciones no Lineales (libro p.15–24).

Métodos (nombres del libro): Gráfico, Bisectriz, Punto Fijo ó Sustituciones Sucesivas,
Newton – Raphson, Falsa Posición ó Regula – Falsi, Secante.

Convenciones del libro:
- Margen de Error Є = |x_{i+1} - x_i| (absoluto, nunca porcentual).
- "No se debe desechar ningún dato intermedio": cada iteración queda en la tabla y en `pasos`.

Decisiones de implementación (el libro no las define):
- Criterio de paro: Є <= tolerancia, o bien Є = 0 al redondear a `decimales` (así se respeta el
  "margen de error es cero" de Punto Fijo y Newton – Raphson cuando la tolerancia es 0).
- Salvaguarda: `max_iteraciones` (por defecto MAX_ITERACIONES); si se alcanza, se avisa.
- Divergencia: si una aproximación deja de ser finita, se vuelve compleja o crece sin control,
  se responde con ErrorMetodo.
"""
import re
from collections.abc import Callable
from decimal import localcontext

import mpmath
from mpmath import mpf

from app.domain.entities import Columna, Paso, ResultadoNumerico, Serie
from app.domain.funciones import ErrorMetodo, FuncionUsuario
from app.use_cases import _comun
from app.use_cases._comun import (
    DECIMALES_LIBRO,
    MAX_ITERACIONES,
    error_libro,
    flt,
    margen,
    muestrear,
)

# Por encima de este valor absoluto se considera que el método diverge (decisión de implementación).
_LIMITE_DIVERGENCIA = mpf(10) ** 100
# Máximo de renglones en la tabla del método Gráfico.
_MAX_FILAS_GRAFICO = 1000

# ---------------------------------------------------------------------------------------------
# Helpers privados
# ---------------------------------------------------------------------------------------------


def fmt(valor: mpf | int, decimales: int = DECIMALES_LIBRO) -> str:
    """`_comun.fmt` con un contexto Decimal amplio.

    `_comun.fmt` usa el contexto Decimal por defecto (28 dígitos): `quantize` falla con
    decimales > ~27 o con valores grandes (p. ej. durante una divergencia). Se envuelve aquí
    sin modificar el módulo compartido.
    """
    with localcontext() as ctx:
        ctx.prec = 250
        return _comun.fmt(valor, decimales)


def tex(valor: mpf | int, decimales: int = DECIMALES_LIBRO) -> str:
    with localcontext() as ctx:
        ctx.prec = 250
        return _comun.tex(valor, decimales)


def _evaluar(f: Callable[[mpf], mpf], x: mpf, nombre: str) -> mpf:
    """Evalúa f(x) y valida que el resultado sea real y finito."""
    try:
        y = f(x)
    except ZeroDivisionError as exc:
        raise ErrorMetodo(f"División entre cero al evaluar {nombre} en x = {fmt(x)}") from exc
    except (ValueError, TypeError) as exc:
        raise ErrorMetodo(f"No se pudo evaluar {nombre} en x = {fmt(x)}") from exc
    if isinstance(y, mpmath.mpc):
        if y.imag != 0:
            raise ErrorMetodo(f"{nombre} no es real en x = {fmt(x)} (fuera del dominio)")
        y = y.real
    y = mpf(y)
    if not mpmath.isfinite(y):
        raise ErrorMetodo(f"{nombre} no está definida en x = {fmt(x)}")
    return y


def _validar_aproximacion(x: mpf, metodo: str, iteracion: int) -> None:
    if not mpmath.isfinite(x) or abs(x) > _LIMITE_DIVERGENCIA:
        raise ErrorMetodo(
            f"{metodo} diverge: la aproximación de la iteración {iteracion} crece sin control. "
            "Prueba con otro valor inicial."
        )


def _validar_parametros(tolerancia: mpf, max_iteraciones: int) -> None:
    if tolerancia < 0:
        raise ErrorMetodo("La tolerancia del Margen de Error Є no puede ser negativa")
    if max_iteraciones < 1:
        raise ErrorMetodo("El máximo de iteraciones debe ser al menos 1")


def _convergio(e: mpf, tolerancia: mpf, decimales: int) -> bool:
    return e <= tolerancia or fmt(e, decimales) == "0"


def _sustituir(latex: str, valor: str) -> str:
    """Sustituye la variable x del LaTeX de la función por `valor` (número o x_{i}).

    `{x}` / `{- x}` (exponentes, fracciones) se reemplaza sin paréntesis extra; el resto, entre
    paréntesis, como escribe el libro: 0.8(1)^2 + (1) - 3. Los subíndices x_{i} van sin paréntesis.
    """
    simbolico = valor.startswith("x_")
    envuelto = valor if simbolico else f"({valor})"
    negativo = valor.startswith("-")

    def llaves(m: re.Match[str]) -> str:
        if m.group(1):  # {- x}
            return "{-" + (envuelto if negativo else valor) + "}"
        return "{" + valor + "}"

    texto = re.sub(r"\{(-\s*)?x\}", llaves, latex)
    return re.sub(r"(?<![\\A-Za-z_])x(?![A-Za-z_])", lambda _: envuelto, texto)


def _signo(y: mpf) -> str:
    if y > 0:
        return "+"
    if y < 0:
        return "-"
    return "0"


def _aviso_max(r: ResultadoNumerico, max_iteraciones: int) -> None:
    r.advertencias.append(
        f"Se alcanzó el máximo de {max_iteraciones} iteraciones sin cumplir el Margen de Error Є; "
        "el resultado es la última aproximación (posible divergencia o convergencia lenta)."
    )


def _series_raiz(
    r: ResultadoNumerico,
    f: FuncionUsuario,
    aproximaciones: list[mpf],
    x: mpf,
    nombre_curva: str | None = None,
) -> None:
    lo, hi = margen(aproximaciones + [x])
    r.series.append(Serie(nombre_curva or f"f(x) = {f.texto}", "linea", muestrear(f, lo, hi)))
    puntos: list[tuple[float, float]] = []
    for xi in aproximaciones:
        try:
            puntos.append((flt(xi), flt(_evaluar(f, xi, "f(x)"))))
        except ErrorMetodo:
            continue
    r.series.append(Serie("Aproximaciones x_i", "puntos", puntos))
    try:
        r.series.append(Serie("Raíz x", "puntos", [(flt(x), flt(_evaluar(f, x, "f(x)")))]))
    except ErrorMetodo:
        pass


def _resultado(r: ResultadoNumerico, x: mpf, e: mpf | None, iteraciones: int, d: int) -> None:
    r.resultado["x"] = fmt(x, d)
    if e is not None:
        r.resultado["Є"] = fmt(e, d)
    r.resultado["iteraciones"] = str(iteraciones)


# ---------------------------------------------------------------------------------------------
# Gráfico (p.15)
# ---------------------------------------------------------------------------------------------


def grafico(
    funcion: FuncionUsuario,
    a: mpf,
    b: mpf,
    paso: mpf,
    decimales: int = DECIMALES_LIBRO,
) -> ResultadoNumerico:
    """Gráfico (p.15): tabla X | Y y localización de los cambios de signo ("indica una raíz")."""
    if paso <= 0:
        raise ErrorMetodo("El paso debe ser mayor que cero")
    if b <= a:
        raise ErrorMetodo("El valor final de X debe ser mayor que el inicial")
    n = int(mpmath.floor((b - a) / paso + mpf("1e-30")))
    if n + 1 > _MAX_FILAS_GRAFICO:
        raise ErrorMetodo(f"Demasiados renglones ({n + 1}); usa un paso mayor (máximo {_MAX_FILAS_GRAFICO})")

    d = decimales
    r = ResultadoNumerico(metodo="grafico", nombre_libro="Gráfico", pagina=15)
    r.columnas = [Columna("X", "X"), Columna("Y", "Y"), Columna("cambio", r"\text{Cambio de signo}")]
    r.pasos.append(Paso("Función", rf"y = {funcion.latex}"))

    valores: list[tuple[mpf, mpf | None]] = []
    for i in range(n + 1):
        x = a + paso * i
        try:
            y: mpf | None = _evaluar(funcion, x, "y")
        except ErrorMetodo:
            y = None
            r.advertencias.append(f"y no está definida en X = {fmt(x, d)}")
        valores.append((x, y))
    if valores[-1][0] < b and (b - valores[-1][0]) > paso * mpf("1e-20"):
        r.advertencias.append(f"El paso no divide exactamente el rango; la tabla termina en X = {fmt(valores[-1][0], d)}")

    intervalos: list[str] = []
    raices: list[str] = []
    puntos_cambio: list[tuple[float, float]] = []
    anterior: tuple[mpf, mpf | None] | None = None
    for x, y in valores:
        cambio: str | None = None
        if y is not None and y == 0:
            cambio = "Raíz exacta (Y = 0)"
            raices.append(fmt(x, d))
            puntos_cambio.append((flt(x), 0.0))
        elif anterior is not None and anterior[1] is not None and y is not None and anterior[1] * y < 0:
            cambio = "Cambio de signo"
            intervalos.append(f"[{fmt(anterior[0], d)}, {fmt(x, d)}]")
            puntos_cambio.append((flt(x), flt(y)))
        r.filas.append({"X": fmt(x, d), "Y": fmt(y, d) if y is not None else None, "cambio": cambio})
        r.pasos.append(
            Paso(
                f"X = {fmt(x, d)}",
                rf"y = {_sustituir(funcion.latex, fmt(x, d))} = {fmt(y, d)}" if y is not None
                else rf"y\ \text{{no definida en }} X = {tex(x, d)}",
            )
        )
        anterior = (x, y)

    r.resultado["intervalos"] = ", ".join(intervalos) if intervalos else "Ninguno"
    if raices:
        r.resultado["raíces exactas"] = ", ".join(raices)
    r.resultado["cambios de signo"] = str(len(intervalos))
    if not intervalos and not raices:
        r.advertencias.append("No hay cambio de signo en el rango: amplía el rango o reduce el paso")
    else:
        r.pasos.append(Paso("El cambio de signo indica una raíz", r"\text{Intervalos: }" + (
            ",\\; ".join(intervalos) if intervalos else r"\text{ninguno}")))

    r.series.append(Serie(f"y = {funcion.texto}", "linea", muestrear(funcion, a, valores[-1][0])))
    r.series.append(
        Serie("Tabla X | Y", "puntos", [(flt(x), flt(y)) for x, y in valores if y is not None])
    )
    r.series.append(Serie("Cambio de signo", "puntos", puntos_cambio))
    return r


# ---------------------------------------------------------------------------------------------
# Bisectriz (p.16)
# ---------------------------------------------------------------------------------------------


def bisectriz(
    funcion: FuncionUsuario,
    a: mpf,
    b: mpf,
    tolerancia: mpf = mpf("0.001"),
    decimales: int = DECIMALES_LIBRO,
    max_iteraciones: int = MAX_ITERACIONES,
) -> ResultadoNumerico:
    """Bisectriz (p.16): x = (a + b)/2.

    a: valor donde la función se comporta positiva; b: donde se comporta negativa.
    Si f(x) es "+", x reemplaza a a; si es "-", x reemplaza a b. Є = |x_{i+1} - x_i|.

    Nota (discrepancia con el libro): la tabla del ejemplo y = x^3 - 6.5x + 2 en [0, 1] tiene
    erratas desde el renglón 5 (b = 0.3175 en vez de 0.3125, a = 0.3 sin justificación). Se
    implementa la fórmula del libro; las 4 primeras filas coinciden (0.5 -, 0.25 +, 0.375 -, 0.3125 -).
    """
    _validar_parametros(tolerancia, max_iteraciones)
    d = decimales
    r = ResultadoNumerico(metodo="bisectriz", nombre_libro="Bisectriz", pagina=16)
    r.columnas = [
        Columna("a", "A"),
        Columna("b", "b"),
        Columna("x", "x"),
        Columna("comportamiento", r"\text{comportamiento}"),
        Columna("error", r"Є = |x_{i+1} - x_i|"),
    ]

    f_a = _evaluar(funcion, a, "f(a)")
    f_b = _evaluar(funcion, b, "f(b)")
    r.pasos.append(Paso("Función", rf"y = {funcion.latex}"))
    r.pasos.append(Paso("Fórmula", r"x = \frac{a + b}{2}"))

    if f_a == 0 or f_b == 0:
        x = a if f_a == 0 else b
        r.advertencias.append(f"x = {fmt(x, d)} es raíz exacta (f(x) = 0); no se requiere iterar")
        _resultado(r, x, None, 0, d)
        _series_raiz(r, funcion, [a, b], x)
        return r
    if f_a * f_b > 0:
        raise ErrorMetodo(
            f"No hay cambio de signo en el intervalo: f(a) = {fmt(f_a, d)} y f(b) = {fmt(f_b, d)} "
            "tienen el mismo signo (f(a)·f(b) > 0)"
        )
    if f_a < 0:
        a, b, f_a, f_b = b, a, f_b, f_a
        r.advertencias.append(
            "Se intercambiaron a y b: según el libro, a es el valor donde la función se comporta "
            f"positiva y b donde se comporta negativa (a = {fmt(a, d)}, b = {fmt(b, d)})"
        )
    r.pasos.append(
        Paso("Datos", rf"a = {fmt(a, d)}\;(f(a) = {fmt(f_a, d)},\ +),\quad b = {fmt(b, d)}\;(f(b) = {fmt(f_b, d)},\ -)")
    )

    anterior: mpf | None = None
    e: mpf | None = None
    aproximaciones: list[mpf] = []
    convergio = False
    i = 0
    x = a
    for i in range(1, max_iteraciones + 1):
        x = (a + b) / 2
        f_x = _evaluar(funcion, x, "f(x)")
        signo = _signo(f_x)
        e = error_libro(x, anterior) if anterior is not None else None
        r.filas.append({
            "a": fmt(a, d),
            "b": fmt(b, d),
            "x": fmt(x, d),
            "comportamiento": signo,
            "error": fmt(e, d) if e is not None else None,
        })
        detalle = rf"x_{{{i}}} = \frac{{{tex(a, d)} + {tex(b, d)}}}{{2}} = {fmt(x, d)},\quad f(x_{{{i}}}) = {fmt(f_x, d)}\ ({signo})"
        if e is not None:
            detalle += rf",\quad Є = |{fmt(x, d)} - {tex(anterior, d)}| = {fmt(e, d)}"  # type: ignore[arg-type]
            r.errores.append(flt(e))
        r.pasos.append(Paso(f"Iteración {i}", detalle))
        aproximaciones.append(x)
        if f_x == 0:
            r.advertencias.append(f"f(x) = 0 exactamente en x = {fmt(x, d)}")
            convergio = True
            break
        if e is not None and _convergio(e, tolerancia, d):
            convergio = True
            break
        if f_x > 0:
            a = x
        else:
            b = x
        anterior = x

    if not convergio:
        _aviso_max(r, max_iteraciones)
    _resultado(r, x, e, i, d)
    if e is not None:
        r.pasos.append(Paso("Margen de Error", rf"Є = |x_{{{i}}} - x_{{{i - 1}}}| = {fmt(e, d)}"))
    r.pasos.append(Paso("Resultado", rf"\boxed{{x = {fmt(x, d)}}}"))
    _series_raiz(r, funcion, aproximaciones, x)
    return r


# ---------------------------------------------------------------------------------------------
# Punto Fijo ó Sustituciones Sucesivas (p.17–18)
# ---------------------------------------------------------------------------------------------


def punto_fijo(
    g: FuncionUsuario,
    x0: mpf,
    tolerancia: mpf = mpf("0.00001"),
    decimales: int = DECIMALES_LIBRO,
    max_iteraciones: int = MAX_ITERACIONES,
    funcion: FuncionUsuario | None = None,
) -> ResultadoNumerico:
    """Punto Fijo ó Sustituciones Sucesivas (p.17–18): x_{i+1} = g(x_i).

    El libro indica "el margen de error (ε) es cero"; el ejemplo se detiene en Є = 0.000008941,
    por eso la tolerancia por defecto es 0.00001 (editable; con 0 se itera hasta que Є redondeado
    sea 0). `funcion` (f(x) original, opcional) solo se usa para graficar.
    """
    _validar_parametros(tolerancia, max_iteraciones)
    d = decimales
    r = ResultadoNumerico(metodo="punto-fijo", nombre_libro="Punto Fijo ó Sustituciones Sucesivas", pagina=17)
    r.columnas = [
        Columna("i", "i"),
        Columna("g", g.latex),
        Columna("x", "x_i"),
        Columna("error", r"Є = |x_{i+1} - x_i|"),
    ]
    r.pasos.append(Paso("Forma equivalente", rf"x = g(x) = {g.latex}"))
    r.pasos.append(Paso("Fórmula iterativa", r"x_{i+1} = g(x_i)"))
    r.filas.append({"i": "0", "g": fmt(x0, d), "x": fmt(x0, d), "error": None})

    x = x0
    e: mpf | None = None
    aproximaciones = [x0]
    errores_previos: list[mpf] = []
    convergio = False
    i = 0
    for i in range(1, max_iteraciones + 1):
        nuevo = _evaluar(g, x, "g(x)")
        _validar_aproximacion(nuevo, "Punto Fijo", i)
        e = error_libro(nuevo, x)
        sustitucion = _sustituir(g.latex, fmt(x, d))
        r.filas.append({"i": str(i), "g": sustitucion, "x": fmt(nuevo, d), "error": fmt(e, d)})
        r.pasos.append(
            Paso(
                f"Iteración {i}",
                rf"x_{{{i}}} = g(x_{{{i - 1}}}) = {sustitucion} = {fmt(nuevo, d)},\quad "
                rf"Є = |x_{{{i}}} - x_{{{i - 1}}}| = |{fmt(nuevo, d)} - {tex(x, d)}| = {fmt(e, d)}",
            )
        )
        r.errores.append(flt(e))
        errores_previos.append(e)
        aproximaciones.append(nuevo)
        x = nuevo
        if _convergio(e, tolerancia, d):
            convergio = True
            break

    if not convergio:
        _aviso_max(r, max_iteraciones)
        if len(errores_previos) >= 3 and errores_previos[-1] > errores_previos[-2] > errores_previos[-3]:
            r.advertencias.append(
                "Є crece en cada iteración: la forma x = g(x) elegida diverge; prueba otro despeje"
            )
    _resultado(r, x, e, i, d)
    r.pasos.append(Paso("Margen de Error", rf"Є = |x_{{{i}}} - x_{{{i - 1}}}| = {fmt(e, d)}"))  # type: ignore[arg-type]
    r.pasos.append(Paso("Resultado", rf"\boxed{{x = {fmt(x, d)}}}"))

    lo, hi = margen(aproximaciones)
    if funcion is not None:
        r.series.append(Serie(f"f(x) = {funcion.texto}", "linea", muestrear(funcion, lo, hi)))
    r.series.append(Serie(f"g(x) = {g.texto}", "linea", muestrear(g, lo, hi)))
    r.series.append(Serie("y = x", "linea", [(flt(lo), flt(lo)), (flt(hi), flt(hi))]))
    r.series.append(Serie("Aproximaciones (x_i, x_{i+1})", "puntos",
                          [(flt(aproximaciones[k]), flt(aproximaciones[k + 1])) for k in range(len(aproximaciones) - 1)]))
    r.series.append(Serie("Raíz x", "puntos", [(flt(x), flt(x))]))
    return r


# ---------------------------------------------------------------------------------------------
# Newton – Raphson (p.19–20)
# ---------------------------------------------------------------------------------------------


def newton_raphson(
    funcion: FuncionUsuario,
    derivada: FuncionUsuario,
    x0: mpf,
    tolerancia: mpf = mpf("0.000001"),
    decimales: int = DECIMALES_LIBRO,
    max_iteraciones: int = MAX_ITERACIONES,
) -> ResultadoNumerico:
    """Newton – Raphson (p.19–20): x_{i+1} = x_i - f(x_i)/f'(x_i).

    El libro indica "el margen de error es igual a cero"; el ejemplo se detiene en Є = 0.0000001,
    por eso la tolerancia por defecto es 0.000001 (editable).
    """
    _validar_parametros(tolerancia, max_iteraciones)
    d = decimales
    r = ResultadoNumerico(metodo="newton-raphson", nombre_libro="Newton – Raphson", pagina=19)
    r.columnas = [Columna("i", "i"), Columna("x", "x_{i+1}"), Columna("error", r"Є = |x_{i+1} - x_i|")]
    r.pasos.append(Paso("Función", rf"f(x) = {funcion.latex}"))
    r.pasos.append(Paso("Derivada", rf"f'(x) = {derivada.latex}"))
    r.pasos.append(Paso("Fórmula", r"x_{i+1} = x_i - \left(\frac{f(x_i)}{f'(x_i)}\right)"))
    r.filas.append({"i": "0", "x": fmt(x0, d), "error": None})

    x = x0
    e: mpf | None = None
    aproximaciones = [x0]
    convergio = False
    i = 0
    for i in range(1, max_iteraciones + 1):
        f_x = _evaluar(funcion, x, "f(x)")
        fp_x = _evaluar(derivada, x, "f'(x)")
        if fp_x == 0 or abs(fp_x) < mpf(10) ** (-(mpmath.mp.dps - 10)):
            raise ErrorMetodo(
                f"f'(x_{i - 1}) = 0 en x = {fmt(x, d)}: la recta tangente es horizontal y no se puede "
                "dividir entre cero. Prueba con otro valor inicial."
            )
        nuevo = x - f_x / fp_x
        _validar_aproximacion(nuevo, "Newton – Raphson", i)
        e = error_libro(nuevo, x)
        xi_sub = f"x_{{{i - 1}}}"
        r.filas.append({"i": str(i), "x": fmt(nuevo, d), "error": fmt(e, d)})
        r.pasos.append(
            Paso(
                f"Iteración {i}",
                rf"x_{{{i}}} = {xi_sub} - \left(\frac{{{_sustituir(funcion.latex, xi_sub)}}}"
                rf"{{{_sustituir(derivada.latex, xi_sub)}}}\right)"
                rf" = {fmt(x, d)} - \left(\frac{{{_sustituir(funcion.latex, fmt(x, d))}}}"
                rf"{{{_sustituir(derivada.latex, fmt(x, d))}}}\right) = {fmt(nuevo, d)}",
            )
        )
        r.pasos.append(
            Paso(
                f"Margen de Error {i}",
                rf"|x_{{{i}}} - {xi_sub}| = |{fmt(nuevo, d)} - {tex(x, d)}| = {fmt(e, d)}",
            )
        )
        r.errores.append(flt(e))
        aproximaciones.append(nuevo)
        x = nuevo
        if _convergio(e, tolerancia, d):
            convergio = True
            break

    if not convergio:
        _aviso_max(r, max_iteraciones)
    _resultado(r, x, e, i, d)
    r.pasos.append(Paso("Resultado", rf"\boxed{{x_{{{i}}} = {fmt(x, d)}}}"))
    _series_raiz(r, funcion, aproximaciones, x)
    return r


# ---------------------------------------------------------------------------------------------
# Falsa Posición ó Regula – Falsi (p.21–22)
# ---------------------------------------------------------------------------------------------


def falsa_posicion(
    funcion: FuncionUsuario,
    a: mpf,
    b: mpf,
    tolerancia: mpf = mpf("0.001"),
    decimales: int = DECIMALES_LIBRO,
    max_iteraciones: int = MAX_ITERACIONES,
) -> ResultadoNumerico:
    """Falsa Posición ó Regula – Falsi (p.21–22): x = a - f(a)(b - a)/(f(b) - f(a)).

    "Tiene un punto fijo que es b, por lo tanto también lo es f(b)": b no cambia y a toma el
    valor de x en cada renglón. Є = |x_{i+1} - x_i| (el renglón 1 no tiene Є).
    """
    _validar_parametros(tolerancia, max_iteraciones)
    d = decimales
    r = ResultadoNumerico(metodo="falsa-posicion", nombre_libro="Falsa Posición ó Regula – Falsi", pagina=21)
    r.columnas = [
        Columna("i", "i"),
        Columna("b", "b"),
        Columna("f_b", "f(b)"),
        Columna("a", "a"),
        Columna("x", "x"),
        Columna("f_a", "f(a)"),
        Columna("error", "Є"),
    ]
    f_a = _evaluar(funcion, a, "f(a)")
    f_b = _evaluar(funcion, b, "f(b)")
    r.pasos.append(Paso("Función", rf"f(x) = {funcion.latex}"))
    r.pasos.append(Paso("Datos", rf"a = {tex(a, d)} \rightarrow f(a) = {fmt(f_a, d)},\quad b = {tex(b, d)} \rightarrow f(b) = {fmt(f_b, d)}"))
    r.pasos.append(Paso("Fórmula", r"x = a - \frac{f(a)\,(b - a)}{f(b) - f(a)}"))

    if f_a == 0 or f_b == 0:
        x = a if f_a == 0 else b
        r.advertencias.append(f"x = {fmt(x, d)} es raíz exacta (f(x) = 0); no se requiere iterar")
        _resultado(r, x, None, 0, d)
        _series_raiz(r, funcion, [a, b], x)
        return r
    if f_a * f_b > 0:
        raise ErrorMetodo(
            f"No hay cambio de signo entre a y b: f(a) = {fmt(f_a, d)} y f(b) = {fmt(f_b, d)} "
            "tienen el mismo signo (f(a)·f(b) > 0)"
        )
    r.filas.append({"i": "0", "b": fmt(b, d), "f_b": fmt(f_b, d), "a": fmt(a, d), "x": None,
                    "f_a": fmt(f_a, d), "error": None})

    anterior: mpf | None = None
    e: mpf | None = None
    aproximaciones: list[mpf] = []
    convergio = False
    aviso_extremo = False
    i = 0
    x = a
    for i in range(1, max_iteraciones + 1):
        if i > 1:
            a = x  # a toma el valor de x (b es punto fijo)
            f_a = _evaluar(funcion, a, "f(a)")
        if f_a == 0:
            r.advertencias.append(f"f(a) = 0 exactamente en a = {fmt(a, d)}")
            convergio = True
            break
        denominador = f_b - f_a
        if denominador == 0:
            raise ErrorMetodo("f(b) - f(a) = 0: no se puede dividir entre cero")
        x = a - f_a * (b - a) / denominador
        _validar_aproximacion(x, "Falsa Posición", i)
        e = error_libro(x, anterior) if anterior is not None else None
        r.filas.append({"i": str(i), "b": fmt(b, d), "f_b": fmt(f_b, d), "a": fmt(a, d), "x": fmt(x, d),
                        "f_a": fmt(f_a, d), "error": fmt(e, d) if e is not None else None})
        detalle = (
            rf"x = {tex(a, d)} - \frac{{({fmt(f_a, d)})\,({tex(b, d)} - {tex(a, d)})}}"
            rf"{{{tex(f_b, d)} - {tex(f_a, d)}}} = {fmt(x, d)}"
        )
        if e is not None:
            detalle += rf",\quad Є = |x_{{{i}}} - x_{{{i - 1}}}| = |{fmt(x, d)} - {tex(anterior, d)}| = {fmt(e, d)}"  # type: ignore[arg-type]
            r.errores.append(flt(e))
        r.pasos.append(Paso(f"Iteración {i}", detalle))
        aproximaciones.append(x)
        if not aviso_extremo:
            f_x = _evaluar(funcion, x, "f(x)")
            if f_x * f_b > 0:
                aviso_extremo = True
                r.advertencias.append(
                    f"En la iteración {i}, f(x) tiene el mismo signo que f(b): el punto fijo b no "
                    "acota la raíz; prueba intercambiando a y b"
                )
        if e is not None and _convergio(e, tolerancia, d):
            convergio = True
            break
        anterior = x

    if not convergio:
        _aviso_max(r, max_iteraciones)
    _resultado(r, x, e, i, d)
    if e is not None:
        r.pasos.append(Paso("Margen de Error", rf"Є = |x_{{{i}}} - x_{{{i - 1}}}| = {fmt(e, d)}"))
    r.pasos.append(Paso("Resultado", rf"\boxed{{x = {fmt(x, d)}}}"))
    _series_raiz(r, funcion, [b] + aproximaciones, x)
    return r


# ---------------------------------------------------------------------------------------------
# Secante (p.23–24)
# ---------------------------------------------------------------------------------------------


def secante(
    funcion: FuncionUsuario,
    x0: mpf,
    x1: mpf,
    tolerancia: mpf = mpf("0.001"),
    decimales: int = DECIMALES_LIBRO,
    max_iteraciones: int = MAX_ITERACIONES,
) -> ResultadoNumerico:
    """Secante (p.23–24): x_{i+1} = x_i - f(x_i)(x_i - x_{i-1}) / (f(x_i) - f(x_{i-1})).

    Requiere dos valores iniciales x_0 y x_1. La tabla del libro muestra en el renglón i el
    valor x_i y |x_i - x_{i-1}| (renglón 1: |x_1 - x_0|). Є = |x_{i+1} - x_i|.
    """
    _validar_parametros(tolerancia, max_iteraciones)
    if x0 == x1:
        raise ErrorMetodo("x_0 y x_1 deben ser distintos")
    d = decimales
    r = ResultadoNumerico(metodo="secante", nombre_libro="Secante", pagina=23)
    r.columnas = [Columna("i", "i"), Columna("x", "x_i"), Columna("error", r"|x_{i+1} - x_i|")]
    r.pasos.append(Paso("Función", rf"f(x) = {funcion.latex}"))
    r.pasos.append(
        Paso("Fórmula", r"x_{i+1} = x_i - \left(\frac{f(x_i)\,(x_i - x_{i-1})}{f(x_i) - f(x_{i-1})}\right)")
    )

    def evaluacion(k: int, xk: mpf) -> mpf:
        fk = _evaluar(funcion, xk, f"f(x_{k})")
        r.pasos.append(
            Paso(
                f"Evaluación x_{k}",
                rf"x_{{{k}}} = {fmt(xk, d)},\quad f(x_{{{k}}}) = {_sustituir(funcion.latex, fmt(xk, d))}"
                rf",\quad f(x_{{{k}}}) = {fmt(fk, d)}",
            )
        )
        return fk

    f0 = evaluacion(0, x0)
    f1 = evaluacion(1, x1)
    e1 = error_libro(x1, x0)
    r.filas.append({"i": "0", "x": fmt(x0, d), "error": None})
    r.filas.append({"i": "1", "x": fmt(x1, d), "error": fmt(e1, d)})
    r.pasos.append(Paso("Iteración 1", rf"|x_1 - x_0| = |{fmt(x1, d)} - {tex(x0, d)}| = {fmt(e1, d)}"))

    anterior, actual = x0, x1
    f_anterior, f_actual = f0, f1
    aproximaciones = [x0, x1]
    e: mpf = e1
    convergio = False
    k = 1
    for n in range(1, max_iteraciones + 1):
        k = n + 1  # índice de la nueva aproximación x_k
        if f_actual == 0:
            r.advertencias.append(f"f(x_{k - 1}) = 0 exactamente: x_{k - 1} es la raíz")
            k -= 1
            convergio = True
            break
        denominador = f_actual - f_anterior
        if denominador == 0:
            raise ErrorMetodo(
                f"f(x_{k - 1}) - f(x_{k - 2}) = 0: no se puede dividir entre cero. "
                "Prueba con otros valores iniciales."
            )
        nuevo = actual - f_actual * (actual - anterior) / denominador
        _validar_aproximacion(nuevo, "Secante", k)
        e = error_libro(nuevo, actual)
        r.filas.append({"i": str(k), "x": fmt(nuevo, d), "error": fmt(e, d)})
        r.pasos.append(
            Paso(
                f"Iteración {k}",
                rf"x_{{{k}}} = x_{{{k - 1}}} - \frac{{f(x_{{{k - 1}}})\,(x_{{{k - 1}}} - x_{{{k - 2}}})}}"
                rf"{{f(x_{{{k - 1}}}) - f(x_{{{k - 2}}})}} = {fmt(actual, d)} - \left\{{\frac{{({fmt(f_actual, d)})"
                rf"({fmt(actual, d)} - {tex(anterior, d)})}}{{({fmt(f_actual, d)}) - ({fmt(f_anterior, d)})}}\right\}}"
                rf" = {fmt(nuevo, d)},\quad |x_{{{k}}} - x_{{{k - 1}}}| = |{fmt(nuevo, d)} - {tex(actual, d)}| = {fmt(e, d)}",
            )
        )
        r.errores.append(flt(e))
        aproximaciones.append(nuevo)
        anterior, f_anterior = actual, f_actual
        actual = nuevo
        if _convergio(e, tolerancia, d):
            convergio = True
            break
        f_actual = evaluacion(k, actual)

    if not convergio:
        _aviso_max(r, max_iteraciones)
    _resultado(r, actual, e, k, d)
    r.pasos.append(Paso("Resultado", rf"\boxed{{x_{{{k}}} = {fmt(actual, d)}}}"))
    _series_raiz(r, funcion, aproximaciones, actual)
    return r
