"""Unidad IV · 6 Ecuaciones Diferenciales Ordinarias (EDO) (libro p.62–73).

Métodos (nombres del libro): Euler hacia Adelante, Euler hacia Atrás, Euler Modificado,
Runge – Kutta de 2do orden, Runge – Kutta de 3er orden, Runge – Kutta de 4to orden por 1/3 de
Simpson, Runge – Kutta de 4to orden por 3/8 de Simpson y Runge – Kutta de Orden Superior.

Notación del libro: f(y_n, t_n) (y primero, t después); t_0 = 0 "siempre es 0 pues parte del
origen" (se permite editarlo); t_{n+1} = t_n + h. El libro no define criterio de paro: se calculan
`pasos` valores y_1, y_2, ... en forma recursiva.
"""
from dataclasses import dataclass
from fractions import Fraction
import re

import mpmath
from mpmath import mpf

from app.domain.entities import Columna, Paso, ResultadoNumerico, Serie
from app.domain.funciones import ErrorMetodo, FuncionUsuario
from app.use_cases._comun import DECIMALES_LIBRO, flt, fmt, tex

# Salvaguarda de implementación (el libro calcula y_1 o y_2): evita respuestas gigantes.
MAX_PASOS = 500

_TOKEN_LATEX = re.compile(r"\\[A-Za-z]+|[A-Za-z]")


# ---------------------------------------------------------------------------
# Utilidades privadas
# ---------------------------------------------------------------------------
def _validar(h: mpf, pasos: int) -> None:
    if h <= 0:
        raise ErrorMetodo("h debe ser mayor que 0 (ancho de cada subintervalo)")
    if pasos < 1:
        raise ErrorMetodo("Se debe calcular al menos y_1 (pasos ≥ 1)")
    if pasos > MAX_PASOS:
        raise ErrorMetodo(f"Demasiados pasos: máximo {MAX_PASOS}")


def _evaluar(f: FuncionUsuario, donde: str, *valores: mpf) -> mpf:
    """Evalúa f y detecta división entre cero, valores complejos o divergencia."""
    try:
        valor = f(*valores)
    except ErrorMetodo as exc:
        raise ErrorMetodo(f"{exc} (al calcular {donde})") from exc
    except (ZeroDivisionError, ValueError, TypeError, OverflowError) as exc:
        raise ErrorMetodo(f"No se pudo evaluar f al calcular {donde}: {exc}") from exc
    if isinstance(valor, mpmath.mpc):
        if valor.imag != 0:
            raise ErrorMetodo(f"f da un valor complejo al calcular {donde}")
        valor = valor.real
    valor = mpf(valor)
    if not mpmath.isfinite(valor):
        raise ErrorMetodo(f"f no es finita al calcular {donde} (división entre cero o divergencia)")
    return valor


def _sustituir(latex: str, valores: dict[str, str]) -> str:
    """Sustituye en el LaTeX de f cada variable (letra suelta) por su valor entre paréntesis.

    Los comandos LaTeX (\\frac, \\sin, \\left...) se respetan; solo se reemplazan letras sueltas
    que sean variables de la ecuación (y, t / V, U, q).
    """

    def reemplazo(m: re.Match[str]) -> str:
        token = m.group(0)
        if token in valores:
            return rf"\left({valores[token]}\right)"
        return token

    return _TOKEN_LATEX.sub(reemplazo, latex)


def _termino(coef: Fraction, simbolo: str, primero: bool = False) -> str:
    """Renderiza `coef·simbolo` como lo escribe el libro: + k_1, - k_1, + 2k_2, + \\frac{k_1}{2}."""
    if coef == 0:
        return ""
    signo = "-" if coef < 0 else "+"
    a = abs(coef)
    # Un valor numérico multiplicado se escribe entre paréntesis: 2(0.253086419), no 20.253086419.
    factor = simbolo if simbolo[0].isalpha() or simbolo.startswith("(") else f"({simbolo})"
    if a == 1:
        cuerpo = simbolo
    elif a.denominator == 1:
        cuerpo = f"{a.numerator}{factor}"
    elif a.numerator == 1:
        cuerpo = rf"\frac{{{simbolo}}}{{{a.denominator}}}"
    else:
        cuerpo = rf"\frac{{{a.numerator}}}{{{a.denominator}}}{factor}"
    if primero:
        return cuerpo if signo == "+" else f"-{cuerpo}"
    return f" {signo} {cuerpo}"


def _frac(c: Fraction) -> str:
    return rf"\frac{{{c.numerator}}}{{{c.denominator}}}" if c.denominator != 1 else str(c.numerator)


def _mpf(c: Fraction) -> mpf:
    return mpf(c.numerator) / c.denominator


def _resultado_ys(r: ResultadoNumerico, ys: list[mpf], d: int, etiqueta: str = "y") -> None:
    for i, y in enumerate(ys[1:], start=1):
        r.resultado[f"{etiqueta}_{i}"] = fmt(y, d)


def _series(r: ResultadoNumerico, ts: list[mpf], ys: list[mpf], nombre: str = "y_n") -> None:
    puntos = [(flt(t), flt(y)) for t, y in zip(ts, ys)]
    r.series.append(Serie(f"(t_n, {nombre})", "linea", puntos))
    r.series.append(Serie(f"Puntos (t_n, {nombre})", "puntos", puntos))


def _datos(f: FuncionUsuario, y0: mpf, t0: mpf, h: mpf, d: int, extra: str = "") -> Paso:
    return Paso(
        "Datos",
        rf"y' = {f.latex},\quad y_0 = {tex(y0, d)},\quad t_0 = {tex(t0, d)},\quad h = {tex(h, d)}{extra}",
    )


# ---------------------------------------------------------------------------
# 6.1 Euler
# ---------------------------------------------------------------------------
def euler_adelante(
    f: FuncionUsuario, y0: mpf, h: mpf, t0: mpf = mpf(0), pasos: int = 1,
    decimales: int = DECIMALES_LIBRO,
) -> ResultadoNumerico:
    """Euler hacia Adelante (p.63–64): y_{n+1} = y_n + h f(y_n, t_n)."""
    _validar(h, pasos)
    d = decimales
    r = ResultadoNumerico(metodo="euler-adelante", nombre_libro="Euler hacia Adelante", pagina=63)
    r.columnas = [
        Columna("n", "n"), Columna("t_n", "t_n"), Columna("y_n", "y_n"),
        Columna("f", "f(y_n, t_n)"), Columna("y_n1", "y_{n+1}"),
    ]
    r.pasos.append(_datos(f, y0, t0, h, d))
    r.pasos.append(Paso("Ecuación", r"y_{n+1} = y_n + h\,f(y_n, t_n)"))

    ts, ys = [t0], [y0]
    for n in range(pasos):
        t, y = ts[-1], ys[-1]
        fy = _evaluar(f, f"y_{n + 1}", y, t)
        y_sig = y + h * fy
        sust = _sustituir(f.latex, {"y": fmt(y, d), "t": fmt(t, d)})
        r.pasos.append(
            Paso(
                f"Sustituyendo para y_{n + 1}",
                rf"y_{{{n + 1}}} = y_{{{n}}} + h\,f(y_{{{n}}}, t_{{{n}}}) = {tex(y, d)} + "
                rf"({fmt(h, d)})\left[{sust}\right] = {fmt(y_sig, d)}",
            )
        )
        t_sig = t + h
        r.pasos.append(
            Paso("El tiempo se incrementa con respecto al valor de h",
                 rf"t_{{{n + 1}}} = t_{{{n}}} + h = {tex(t, d)} + {tex(h, d)} = {fmt(t_sig, d)}")
        )
        r.filas.append({"n": str(n), "t_n": fmt(t, d), "y_n": fmt(y, d), "f": fmt(fy, d),
                        "y_n1": fmt(y_sig, d)})
        ts.append(t_sig)
        ys.append(y_sig)

    r.pasos.append(Paso("Resultado", rf"\boxed{{y_{{{pasos}}} = {fmt(ys[-1], d)}}}"))
    _resultado_ys(r, ys, d)
    _series(r, ts, ys)
    return r


def euler_atras(
    f: FuncionUsuario, y0: mpf, h: mpf, t0: mpf = mpf(0), pasos: int = 1,
    y_siguiente: mpf | None = None, decimales: int = DECIMALES_LIBRO,
) -> ResultadoNumerico:
    """Euler hacia Atrás (p.65): y_{n+1} = y_n + h f(y_{n+1}, t_{n+1}).

    El libro no resuelve ejemplo. Como en el ejemplo de Euler Modificado (p.66), dentro de f se
    usa el valor y_{n+1} = y_n (o el `y_siguiente` dado para el primer paso); un cálculo por paso.
    """
    _validar(h, pasos)
    d = decimales
    r = ResultadoNumerico(metodo="euler-atras", nombre_libro="Euler hacia Atrás", pagina=65)
    r.columnas = [
        Columna("n", "n"), Columna("t_n", "t_n"), Columna("y_n", "y_n"),
        Columna("t_n1", "t_{n+1}"), Columna("y_arranque", r"y_{n+1}\ (\text{en } f)"),
        Columna("f", "f(y_{n+1}, t_{n+1})"), Columna("y_n1", "y_{n+1}"),
    ]
    extra = rf",\quad y_1 = {tex(y_siguiente, d)}" if y_siguiente is not None else ""
    r.pasos.append(_datos(f, y0, t0, h, d, extra))
    r.pasos.append(Paso("Ecuación", r"y_{n+1} = y_n + h\,f(y_{n+1}, t_{n+1})"))

    ts, ys = [t0], [y0]
    for n in range(pasos):
        t, y = ts[-1], ys[-1]
        t_sig = t + h
        dado = n == 0 and y_siguiente is not None
        y_arr = y_siguiente if dado else y
        assert y_arr is not None
        r.pasos.append(
            Paso("El tiempo se incrementa con respecto al valor de h",
                 rf"t_{{{n + 1}}} = t_{{{n}}} + h = {tex(t, d)} + {tex(h, d)} = {fmt(t_sig, d)}")
        )
        r.pasos.append(
            Paso(
                "Valor de y_{n+1} dentro de f",
                rf"y_{{{n + 1}}} = {fmt(y_arr, d)}\ (\text{{dato}})" if dado
                else rf"y_{{{n + 1}}} = y_{{{n}}} = {fmt(y_arr, d)}",
            )
        )
        fy = _evaluar(f, f"y_{n + 1}", y_arr, t_sig)
        y_sig = y + h * fy
        sust = _sustituir(f.latex, {"y": fmt(y_arr, d), "t": fmt(t_sig, d)})
        r.pasos.append(
            Paso(
                f"Sustituyendo para y_{n + 1}",
                rf"y_{{{n + 1}}} = y_{{{n}}} + h\,f(y_{{{n + 1}}}, t_{{{n + 1}}}) = {tex(y, d)} + "
                rf"({fmt(h, d)})\left[{sust}\right] = {fmt(y_sig, d)}",
            )
        )
        r.filas.append({"n": str(n), "t_n": fmt(t, d), "y_n": fmt(y, d), "t_n1": fmt(t_sig, d),
                        "y_arranque": fmt(y_arr, d), "f": fmt(fy, d), "y_n1": fmt(y_sig, d)})
        ts.append(t_sig)
        ys.append(y_sig)

    r.pasos.append(Paso("Resultado", rf"\boxed{{y_{{{pasos}}} = {fmt(ys[-1], d)}}}"))
    _resultado_ys(r, ys, d)
    _series(r, ts, ys)
    return r


def euler_modificado(
    f: FuncionUsuario, y0: mpf, h: mpf, t0: mpf = mpf(0), pasos: int = 1,
    y_siguiente: mpf | None = None, decimales: int = DECIMALES_LIBRO,
) -> ResultadoNumerico:
    """Euler Modificado (p.66): y'_{n+1} = y_n + h/2 [f(y_n, t_n) + f(y_{n+1}, t_{n+1})].

    En el ejemplo del libro y_1 se da como dato (y_1 = y_0 = 1.2) y el valor obtenido se escribe
    y'_1. Arranque: y_{n+1} = y_n o el `y_siguiente` dado para el primer paso. Un cálculo por paso
    (el libro no define iteración del corrector).
    """
    _validar(h, pasos)
    d = decimales
    r = ResultadoNumerico(metodo="euler-modificado", nombre_libro="Euler Modificado", pagina=66)
    r.columnas = [
        Columna("n", "n"), Columna("t_n", "t_n"), Columna("y_n", "y_n"),
        Columna("t_n1", "t_{n+1}"), Columna("y_arranque", "y_{n+1}"),
        Columna("f_n", "f(y_n, t_n)"), Columna("f_n1", "f(y_{n+1}, t_{n+1})"),
        Columna("yp_n1", "y'_{n+1}"),
    ]
    extra = rf",\quad y_1 = {tex(y_siguiente, d)}" if y_siguiente is not None else ""
    r.pasos.append(_datos(f, y0, t0, h, d, extra))
    r.pasos.append(
        Paso("Ecuación", r"y'_{n+1} = y_n + \frac{h}{2}\left[f(y_n, t_n) + f(y_{n+1}, t_{n+1})\right]")
    )

    ts, ys = [t0], [y0]
    for n in range(pasos):
        t, y = ts[-1], ys[-1]
        t_sig = t + h
        dado = n == 0 and y_siguiente is not None
        y_arr = y_siguiente if dado else y
        assert y_arr is not None
        r.pasos.append(
            Paso(f"Considerando t_{n} y t_{n + 1}",
                 rf"t_{{{n}}} = {fmt(t, d)},\quad t_{{{n + 1}}} = t_{{{n}}} + h = {fmt(t_sig, d)},\quad "
                 + (rf"y_{{{n + 1}}} = {fmt(y_arr, d)}" if dado
                    else rf"y_{{{n + 1}}} = y_{{{n}}} = {fmt(y_arr, d)}"))
        )
        f_n = _evaluar(f, f"f(y_{n}, t_{n})", y, t)
        f_n1 = _evaluar(f, f"f(y_{n + 1}, t_{n + 1})", y_arr, t_sig)
        y_sig = y + h / 2 * (f_n + f_n1)
        s_n = _sustituir(f.latex, {"y": fmt(y, d), "t": fmt(t, d)})
        s_n1 = _sustituir(f.latex, {"y": fmt(y_arr, d), "t": fmt(t_sig, d)})
        r.pasos.append(
            Paso(
                f"Sustituyendo para y'_{n + 1}",
                rf"y'_{{{n + 1}}} = {tex(y, d)} + \left(\frac{{{fmt(h, d)}}}{{2}}\right)"
                rf"\left\{{\left[{s_n}\right] + \left[{s_n1}\right]\right\}}",
            )
        )
        r.pasos.append(
            Paso(
                "Simplificando",
                rf"y'_{{{n + 1}}} = {tex(y, d)} + ({fmt(h / 2, d)})\left[{tex(f_n, d)} + {tex(f_n1, d)}\right]"
                rf" = {fmt(y_sig, d)}",
            )
        )
        r.filas.append({"n": str(n), "t_n": fmt(t, d), "y_n": fmt(y, d), "t_n1": fmt(t_sig, d),
                        "y_arranque": fmt(y_arr, d), "f_n": fmt(f_n, d), "f_n1": fmt(f_n1, d),
                        "yp_n1": fmt(y_sig, d)})
        ts.append(t_sig)
        ys.append(y_sig)

    r.pasos.append(Paso("Resultado", rf"\boxed{{y'_{{{pasos}}} = {fmt(ys[-1], d)}}}"))
    _resultado_ys(r, ys, d, "y'")
    _series(r, ts, ys)
    return r


# ---------------------------------------------------------------------------
# Método Runge – Kutta (p.67–71): motor común con las k's del libro
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class _Etapa:
    """k_i = h f(y_n + Σ c_j k_j, t_n + a·h)."""

    c: tuple[tuple[int, Fraction], ...]  # (j, coeficiente de k_j) en el argumento y
    a: Fraction  # coeficiente de h en el argumento t


@dataclass(frozen=True)
class _EsquemaRK:
    slug: str
    nombre_libro: str
    pagina: int
    etapas: tuple[_Etapa, ...]
    factor: Fraction  # y_{n+1} = y_n + factor (Σ w_i k_i)
    pesos: tuple[int, ...]


F = Fraction
RK2 = _EsquemaRK(
    "runge-kutta-2", "Runge – Kutta de 2do orden", 68,
    (_Etapa((), F(0)), _Etapa(((1, F(1)),), F(1))),
    F(1, 2), (1, 1),
)
RK3 = _EsquemaRK(
    "runge-kutta-3", "Runge – Kutta de 3er orden", 69,
    (_Etapa((), F(0)), _Etapa(((1, F(1, 2)),), F(1, 2)), _Etapa(((1, F(-1)), (2, F(2))), F(1))),
    F(1, 6), (1, 4, 1),
)
RK4_13 = _EsquemaRK(
    "runge-kutta-4-simpson-1-3", "Runge – Kutta de 4to orden por 1/3 de Simpson", 70,
    (_Etapa((), F(0)), _Etapa(((1, F(1, 2)),), F(1, 2)), _Etapa(((2, F(1, 2)),), F(1, 2)),
     _Etapa(((3, F(1)),), F(1))),
    F(1, 6), (1, 2, 2, 1),
)
# k_3 tal cual el libro (p.71): y_n + k_1/3 + k_2/3, t_n + 2/3 h.
RK4_38 = _EsquemaRK(
    "runge-kutta-4-simpson-3-8", "Runge – Kutta de 4to orden por 3/8 de Simpson", 71,
    (_Etapa((), F(0)), _Etapa(((1, F(1, 3)),), F(1, 3)), _Etapa(((1, F(1, 3)), (2, F(1, 3))), F(2, 3)),
     _Etapa(((1, F(1)), (2, F(-1)), (3, F(1))), F(1))),
    F(1, 8), (1, 3, 3, 1),
)


def _argumentos(e: _Etapa, y: str, t: str, ks: list[str], h: str) -> tuple[str, str]:
    """LaTeX de los argumentos (y, t) de f para una etapa, con símbolos o con valores."""
    arg_y = y + "".join(_termino(c, ks[j - 1]) for j, c in e.c)
    arg_t = t + _termino(e.a, h)
    return arg_y, arg_t


def _runge_kutta(
    esquema: _EsquemaRK, f: FuncionUsuario, y0: mpf, h: mpf, t0: mpf, pasos: int, d: int,
) -> ResultadoNumerico:
    _validar(h, pasos)
    r = ResultadoNumerico(metodo=esquema.slug, nombre_libro=esquema.nombre_libro, pagina=esquema.pagina)
    m = len(esquema.etapas)
    r.columnas = [Columna("n", "n"), Columna("t_n", "t_n"), Columna("y_n", "y_n")]
    r.columnas += [Columna(f"k_{i}", f"k_{i}") for i in range(1, m + 1)]
    r.columnas.append(Columna("y_n1", "y_{n+1}"))

    r.pasos.append(_datos(f, y0, t0, h, d))
    simb_k = [f"k_{i}" for i in range(1, m + 1)]
    for i, e in enumerate(esquema.etapas, start=1):
        ay, at = _argumentos(e, "y_n", "t_n", simb_k, "h")
        r.pasos.append(Paso(f"Fórmula de k_{i}", rf"k_{i} = h\,f({ay}, {at})"))
    suma = "".join(_termino(F(w), f"k_{i}", i == 1) for i, w in enumerate(esquema.pesos, start=1))
    r.pasos.append(Paso("Fórmula", rf"y_{{n+1}} = y_n + {_frac(esquema.factor)}\left({suma}\right)"))

    ts, ys = [t0], [y0]
    for n in range(pasos):
        t, y = ts[-1], ys[-1]
        ks: list[mpf] = []
        for i, e in enumerate(esquema.etapas, start=1):
            arg_y = y + sum((_mpf(c) * ks[j - 1] for j, c in e.c), mpf(0))
            arg_t = t + _mpf(e.a) * h
            fk = _evaluar(f, f"k_{i} (n = {n})", arg_y, arg_t)
            k = h * fk
            ay_s, at_s = _argumentos(e, f"y_{n}", f"t_{n}", simb_k, "h")
            ay_v, at_v = _argumentos(e, tex(y, d), tex(t, d), [tex(x, d) for x in ks], tex(h, d))
            sust = _sustituir(f.latex, {"y": ay_v, "t": at_v})
            r.pasos.append(
                Paso(
                    f"Calculando k_{i} (n = {n})",
                    rf"k_{i} = h\,f({ay_s}, {at_s}) = ({fmt(h, d)})\left[{sust}\right]"
                    rf" = \boxed{{{fmt(k, d)}}}",
                )
            )
            ks.append(k)
        y_sig = y + _mpf(esquema.factor) * sum(
            (w * k for w, k in zip(esquema.pesos, ks)), mpf(0)
        )
        suma_v = "".join(
            _termino(F(w), tex(k, d), i == 1) for i, (w, k) in enumerate(zip(esquema.pesos, ks), start=1)
        )
        r.pasos.append(
            Paso(
                f"Sustituyendo para y_{n + 1}",
                rf"y_{{{n + 1}}} = {tex(y, d)} + {_frac(esquema.factor)}\left[{suma_v}\right]"
                rf" = \boxed{{{fmt(y_sig, d)}}}",
            )
        )
        t_sig = t + h
        r.pasos.append(
            Paso("El tiempo se incrementa con respecto al valor de h",
                 rf"t_{{{n + 1}}} = t_{{{n}}} + h = {tex(t, d)} + {tex(h, d)} = {fmt(t_sig, d)}")
        )
        fila: dict[str, str | None] = {"n": str(n), "t_n": fmt(t, d), "y_n": fmt(y, d)}
        fila.update({f"k_{i}": fmt(k, d) for i, k in enumerate(ks, start=1)})
        fila["y_n1"] = fmt(y_sig, d)
        r.filas.append(fila)
        ts.append(t_sig)
        ys.append(y_sig)

    r.pasos.append(Paso("Resultado", rf"\boxed{{y_{{{pasos}}} = {fmt(ys[-1], d)}}}"))
    _resultado_ys(r, ys, d)
    _series(r, ts, ys)
    return r


def runge_kutta_2(f: FuncionUsuario, y0: mpf, h: mpf, t0: mpf = mpf(0), pasos: int = 1,
                  decimales: int = DECIMALES_LIBRO) -> ResultadoNumerico:
    """Runge – Kutta de 2do orden (p.68)."""
    return _runge_kutta(RK2, f, y0, h, t0, pasos, decimales)


def runge_kutta_3(f: FuncionUsuario, y0: mpf, h: mpf, t0: mpf = mpf(0), pasos: int = 1,
                  decimales: int = DECIMALES_LIBRO) -> ResultadoNumerico:
    """Runge – Kutta de 3er orden (p.69)."""
    return _runge_kutta(RK3, f, y0, h, t0, pasos, decimales)


def runge_kutta_4_simpson_1_3(f: FuncionUsuario, y0: mpf, h: mpf, t0: mpf = mpf(0), pasos: int = 1,
                              decimales: int = DECIMALES_LIBRO) -> ResultadoNumerico:
    """Runge – Kutta de 4to orden por 1/3 de Simpson (p.70)."""
    return _runge_kutta(RK4_13, f, y0, h, t0, pasos, decimales)


def runge_kutta_4_simpson_3_8(f: FuncionUsuario, y0: mpf, h: mpf, t0: mpf = mpf(0), pasos: int = 1,
                              decimales: int = DECIMALES_LIBRO) -> ResultadoNumerico:
    """Runge – Kutta de 4to orden por 3/8 de Simpson (p.71)."""
    return _runge_kutta(RK4_38, f, y0, h, t0, pasos, decimales)


# ---------------------------------------------------------------------------
# Runge – Kutta de Orden Superior (p.72–73)
# ---------------------------------------------------------------------------
def runge_kutta_orden_superior(
    f: FuncionUsuario, y0: mpf, yp0: mpf, h: mpf, q0: mpf = mpf(0), pasos: int = 1,
    decimales: int = DECIMALES_LIBRO,
) -> ResultadoNumerico:
    """Runge – Kutta de Orden Superior (p.72–73). V_n = y', U_n = y, q_n = t; y'' = f(V, U, q).

    k_1 = h V_n;  m_1 = h f(V_n, U_n, q_n);  k_2 = h (V_n + m_1);
    m_2 = h f(V_n + m_1, U_n + k_1, q_n + h);
    y_{n+1} = y_n + ½ (k_1 + k_2);  y'_{n+1} = y'_n + ½ (m_1 + m_2).
    """
    _validar(h, pasos)
    d = decimales
    r = ResultadoNumerico(metodo="runge-kutta-orden-superior",
                          nombre_libro="Runge – Kutta de Orden Superior", pagina=72)
    r.columnas = [
        Columna("n", "n"), Columna("q_n", "q_n"), Columna("U_n", "U_n = y_n"),
        Columna("V_n", "V_n = y'_n"), Columna("k_1", "k_1"), Columna("m_1", "m_1"),
        Columna("k_2", "k_2"), Columna("m_2", "m_2"), Columna("y_n1", "y_{n+1}"),
        Columna("yp_n1", "y'_{n+1}"),
    ]
    r.pasos.append(
        Paso("Datos", rf"y'' = {f.latex},\quad y_0 = {tex(y0, d)},\quad y'_0 = {tex(yp0, d)},\quad "
                      rf"h = {tex(h, d)},\quad q_0 = t_0 = {tex(q0, d)}")
    )
    r.pasos.append(Paso("Variables", r"V_n = y',\quad U_n = y,\quad q_n = t"))
    r.pasos.append(
        Paso("Fórmulas",
             r"k_1 = h\,V_n,\quad m_1 = h\,f(V_n, U_n, q_n),\quad k_2 = h\,(V_n + m_1),\quad "
             r"m_2 = h\,f(V_n + m_1, U_n + k_1, q_n + h)")
    )
    r.pasos.append(
        Paso("Fórmulas", r"y_{n+1} = y_n + \frac{1}{2}(k_1 + k_2),\quad y'_{n+1} = y'_n + \frac{1}{2}(m_1 + m_2)")
    )

    qs, us, vs = [q0], [y0], [yp0]
    for n in range(pasos):
        q, u, v = qs[-1], us[-1], vs[-1]
        r.pasos.append(
            Paso(f"Valores (n = {n})",
                 rf"V_{{{n}}} = y'_{{{n}}} = {fmt(v, d)},\quad U_{{{n}}} = y_{{{n}}} = {fmt(u, d)},"
                 rf"\quad q_{{{n}}} = t_{{{n}}} = {fmt(q, d)}")
        )
        k1 = h * v
        r.pasos.append(Paso(f"Calculando k_1 (n = {n})",
                            rf"k_1 = h\,V_n = ({fmt(h, d)})({fmt(v, d)}) = \boxed{{{fmt(k1, d)}}}"))
        m1 = h * _evaluar(f, f"m_1 (n = {n})", v, u, q)
        s1 = _sustituir(f.latex, {"V": fmt(v, d), "U": fmt(u, d), "q": fmt(q, d)})
        r.pasos.append(Paso(f"Calculando m_1 (n = {n})",
                            rf"m_1 = h\,f(V_n, U_n, q_n) = ({fmt(h, d)})\left[{s1}\right]"
                            rf" = \boxed{{{fmt(m1, d)}}}"))
        k2 = h * (v + m1)
        r.pasos.append(Paso(f"Calculando k_2 (n = {n})",
                            rf"k_2 = h\,(V_n + m_1) = ({fmt(h, d)})\left({fmt(v, d)} + {tex(m1, d)}\right)"
                            rf" = \boxed{{{fmt(k2, d)}}}"))
        m2 = h * _evaluar(f, f"m_2 (n = {n})", v + m1, u + k1, q + h)
        s2 = _sustituir(f.latex, {"V": f"{tex(v, d)} + {tex(m1, d)}", "U": f"{tex(u, d)} + {tex(k1, d)}",
                                  "q": f"{tex(q, d)} + {tex(h, d)}"})
        r.pasos.append(Paso(f"Calculando m_2 (n = {n})",
                            rf"m_2 = h\,f(V_n + m_1, U_n + k_1, q_n + h) = ({fmt(h, d)})\left[{s2}\right]"
                            rf" = \boxed{{{fmt(m2, d)}}}"))
        u_sig = u + (k1 + k2) / 2
        v_sig = v + (m1 + m2) / 2
        r.pasos.append(Paso(f"Calculando y_{n + 1}",
                            rf"y_{{{n + 1}}} = U_n + \frac{{1}}{{2}}(k_1 + k_2) = {tex(u, d)} + \frac{{1}}{{2}}"
                            rf"\left({tex(k1, d)} + {tex(k2, d)}\right) = \boxed{{{fmt(u_sig, d)}}}"))
        r.pasos.append(Paso(f"Calculando y'_{n + 1}",
                            rf"y'_{{{n + 1}}} = V_n + \frac{{1}}{{2}}(m_1 + m_2) = {tex(v, d)} + \frac{{1}}{{2}}"
                            rf"\left({tex(m1, d)} + {tex(m2, d)}\right) = \boxed{{{fmt(v_sig, d)}}}"))
        r.filas.append({"n": str(n), "q_n": fmt(q, d), "U_n": fmt(u, d), "V_n": fmt(v, d),
                        "k_1": fmt(k1, d), "m_1": fmt(m1, d), "k_2": fmt(k2, d), "m_2": fmt(m2, d),
                        "y_n1": fmt(u_sig, d), "yp_n1": fmt(v_sig, d)})
        qs.append(q + h)
        us.append(u_sig)
        vs.append(v_sig)

    r.pasos.append(Paso("Resultado", rf"\boxed{{y_{{{pasos}}} = {fmt(us[-1], d)},\quad "
                                     rf"y'_{{{pasos}}} = {fmt(vs[-1], d)}}}"))
    for i in range(1, pasos + 1):
        r.resultado[f"y_{i}"] = fmt(us[i], d)
        r.resultado[f"y'_{i}"] = fmt(vs[i], d)
    puntos_y = [(flt(q), flt(u)) for q, u in zip(qs, us)]
    puntos_v = [(flt(q), flt(v)) for q, v in zip(qs, vs)]
    r.series.append(Serie("(q_n, y_n)", "linea", puntos_y))
    r.series.append(Serie("Puntos (q_n, y_n)", "puntos", puntos_y))
    r.series.append(Serie("(q_n, y'_n)", "linea", puntos_v))
    r.series.append(Serie("Puntos (q_n, y'_n)", "puntos", puntos_v))
    return r

