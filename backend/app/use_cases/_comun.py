"""Utilidades compartidas por todos los métodos (CAPA 2). Solo depende de domain y mpmath.

Convenciones del libro:
- Resultados con 9 decimales (redondeo), configurable con `decimales`.
- Margen de Error del libro: Є = |x_{i+1} - x_i| (absoluto, no porcentual).
"""
from collections.abc import Callable, Sequence
from decimal import ROUND_HALF_UP, Decimal, localcontext

import mpmath
from mpmath import mpf

from app.domain.funciones import ErrorMetodo

mpmath.mp.dps = 50  # precisión de trabajo

DECIMALES_LIBRO = 9
# Salvaguarda de implementación: el libro no define límite de iteraciones.
MAX_ITERACIONES = 100


def num(valor: str | int | float | mpf) -> mpf:
    """Convierte la entrada (str preferentemente) a mpf sin pasar por float."""
    try:
        if isinstance(valor, str):
            texto = valor.strip()
            if "/" in texto:
                numerador, denominador = texto.split("/", 1)
                return mpf(numerador.strip()) / mpf(denominador.strip())
            return mpf(texto)
        return mpf(valor)
    except (ValueError, TypeError, ZeroDivisionError) as exc:
        raise ErrorMetodo(f"Valor numérico inválido: {valor!r}") from exc


def fmt(valor: mpf | int, decimales: int = DECIMALES_LIBRO) -> str:
    """Serializa a str redondeando a `decimales` (como el libro) y quitando ceros sobrantes."""
    valor = mpf(valor)
    if not mpmath.isfinite(valor):
        raise ErrorMetodo("El cálculo produjo un valor no finito (posible divergencia o división entre cero)")
    with localcontext() as ctx:
        ctx.prec = 120  # el contexto por defecto (28 dígitos) no alcanza para 30 decimales
        # 40 cifras primero: elimina artefactos binarios de mpf (p. ej. ...4374999) antes de redondear empates
        d = Decimal(mpmath.nstr(valor, 40, strip_zeros=False))
        d = d.quantize(Decimal(1).scaleb(-decimales), rounding=ROUND_HALF_UP)
        texto = format(d.normalize(), "f")
    return "0" if texto in ("-0", "") else texto


def flt(valor: mpf) -> float:
    """Solo para coordenadas de gráfica y errores."""
    return float(valor)


def error_libro(nuevo: mpf, anterior: mpf) -> mpf:
    """Margen de Error Є = |x_{i+1} - x_i|."""
    return abs(nuevo - anterior)


def muestrear(
    f: Callable[[mpf], mpf], a: mpf, b: mpf, n: int = 120
) -> list[tuple[float, float]]:
    """Puntos (float) para graficar f en [a, b]; omite los puntos donde f no está definida."""
    puntos: list[tuple[float, float]] = []
    if a == b:
        return puntos
    for i in range(n + 1):
        x = a + (b - a) * i / n
        try:
            y = f(x)
            if mpmath.isfinite(y) and not isinstance(y, mpmath.mpc):
                puntos.append((flt(x), flt(y)))
        except (ZeroDivisionError, ValueError, TypeError):
            continue
    return puntos


def margen(valores: Sequence[mpf], fraccion: float = 0.15) -> tuple[mpf, mpf]:
    """Intervalo [min, max] ampliado para graficar alrededor de los datos."""
    lo, hi = min(valores), max(valores)
    extra = (hi - lo) * fraccion if hi != lo else mpf(1)
    return lo - extra, hi + extra


def tex(valor: mpf | int, decimales: int = DECIMALES_LIBRO) -> str:
    """Número para LaTeX; negativos entre paréntesis al sustituir."""
    texto = fmt(valor, decimales)
    return f"({texto})" if texto.startswith("-") else texto
