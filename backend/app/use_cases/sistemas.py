"""Unidad II · 3 Solución de Ecuaciones Lineales (libro p.28–44).

Métodos: Montante, Gauss – Jordán, Eliminación Gaussiana (directos, con fracciones exactas),
Gauss – Seidel, Jacobi (iterativos, con mpmath) y Raíces de Polinomios (divisores del término
independiente + División Sintética + Fórmula general). Variables y formato del libro.

Los directos trabajan con `fractions.Fraction` y serializan como "62/87"; además se da el decimal.
Los iterativos nunca pasan por float salvo los errores Є por iteración (para graficar).
"""
import math
import re
from collections.abc import Callable, Sequence
from decimal import ROUND_HALF_UP, Decimal, localcontext
from fractions import Fraction

import mpmath
from mpmath import mpf

from app.domain.entities import Columna, Matriz, Paso, ResultadoNumerico, Serie
from app.domain.funciones import ErrorMetodo
from app.use_cases._comun import (
    DECIMALES_LIBRO,
    MAX_ITERACIONES,
    error_libro,
    flt,
    margen,
    muestrear,
    num,
)

# Salvaguarda de implementación (el libro no la define): tamaño del término independiente
# para enumerar sus divisores en Raíces de Polinomios.
MAX_TERMINO_INDEPENDIENTE = 10**12

_SUB = str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉")
_DESUB = str.maketrans("₀₁₂₃₄₅₆₇₈₉", "0123456789")
_ORDINAL_RENGLON = {1: "1er", 2: "2do", 3: "3er", 4: "4to", 5: "5to", 6: "6to", 7: "7mo",
                    8: "8vo", 9: "9no", 10: "10mo"}


# --------------------------------------------------------------------------------------------
# Utilidades privadas
# --------------------------------------------------------------------------------------------
def fraccion(valor: str | int | Fraction) -> Fraction:
    """Convierte la entrada ("2", "-1/3", "0.5") a fracción exacta sin pasar por float."""
    if isinstance(valor, Fraction):
        return valor
    if isinstance(valor, int):
        return Fraction(valor)
    try:
        return Fraction(str(valor).strip().replace("−", "-").replace(" ", ""))
    except (ValueError, ZeroDivisionError, TypeError) as exc:
        raise ErrorMetodo(f"Valor numérico inválido: {valor!r}") from exc


def _fr(q: Fraction) -> str:
    """Fracción como en el libro: "62/87", "-1", "1/2"."""
    return str(q.numerator) if q.denominator == 1 else f"{q.numerator}/{q.denominator}"


def _fp(q: Fraction) -> str:
    """Fracción entre paréntesis si es negativa (al sustituir)."""
    return f"({_fr(q)})" if q < 0 else _fr(q)


def _redondear(valor: Decimal, d: int) -> str:
    """Redondeo del libro (mitad hacia arriba) a d decimales, sin ceros sobrantes."""
    with localcontext() as ctx:
        ctx.prec = 200  # el contexto por defecto (28 cifras) falla con valores grandes
        texto = format(valor.quantize(Decimal(1).scaleb(-d), rounding=ROUND_HALF_UP).normalize(),
                       "f")
    return "0" if texto in ("-0", "") else texto


def _dec(q: Fraction, d: int) -> str:
    """Decimal de apoyo de una fracción exacta (sin pasar por binario)."""
    with localcontext() as ctx:
        ctx.prec = 80
        return _redondear(Decimal(q.numerator) / Decimal(q.denominator), d)


def _fmt(x: mpf, d: int) -> str:
    """Como `fmt`, pero redondea antes a 40 cifras: mpf es binario y, p. ej., 1.5088184375
    queda como 1.50881843749999…, que `fmt` redondearía a …437 en vez de …438 (libro)."""
    return _redondear(Decimal(mpmath.nstr(x, 40, strip_zeros=False)), d)


def _sub(i: int) -> str:
    return str(i).translate(_SUB)


def _vtex(nombre: str) -> str:
    """Nombre de variable a LaTeX: x₁ -> x_{1}, x1 -> x_{1}, a -> a."""
    m = re.fullmatch(r"([A-Za-zα-ωΑ-Ω]+)([0-9₀-₉]+)", nombre)
    if m:
        return f"{m.group(1)}_{{{m.group(2).translate(_DESUB)}}}"
    return nombre


def _tiene_subindice(nombre: str) -> bool:
    return "_{" in _vtex(nombre) or "_" in nombre


def _vk_tex(nombre: str, k: int) -> str:
    """Variable con número de iteración: x_{5}; si ya tiene subíndice, x_{1}^{(5)}."""
    base = _vtex(nombre)
    return rf"{base}^{{({k})}}" if _tiene_subindice(nombre) else rf"{base}_{{{k}}}"


def _vk_txt(nombre: str, k: int) -> str:
    return f"{nombre}^({k})" if _tiene_subindice(nombre) else f"{nombre}{_sub(k)}"


def _suma(terminos: Sequence[tuple[bool, str]]) -> str:
    """Une términos (negativo, texto) con signos: [(F,'2a'),(T,'b')] -> '2a - b'."""
    salida = ""
    for negativo, texto in terminos:
        if not salida:
            salida = f"-{texto}" if negativo else texto
        else:
            salida += f" - {texto}" if negativo else f" + {texto}"
    return salida or "0"


def _coef(mag: str) -> str:
    """Coeficiente delante de una variable: '' si es 1; '7/2\\,' si es fracción o decimal."""
    if mag == "1":
        return ""
    return mag + (r"\," if ("/" in mag or "." in mag) else "")


def _ecuacion(coefs: Sequence, b, nombres: Sequence[str], f: Callable[[object], str]) -> str:
    """'2a + 5b - 2c = 1' (f da la magnitud del coeficiente como str)."""
    terminos = [(c < 0, f"{_coef(f(abs(c)))}{_vtex(v)}") for c, v in zip(coefs, nombres) if c != 0]
    lado_der = f(b) if b >= 0 else f"-{f(-b)}"
    return f"{_suma(terminos)} = {lado_der}"


def _aligned(lineas: Sequence[str]) -> str:
    return r"\begin{aligned}" + r" \\ ".join(lineas) + r"\end{aligned}"


def _texto_matriz(M: Sequence[Sequence[Fraction]]) -> list[list[str]]:
    return [[_fr(x) for x in fila] for fila in M]


def _ordinal_renglon(i: int) -> str:
    """i empieza en 0: '1er', '2do', '3er'..."""
    return _ORDINAL_RENGLON.get(i + 1, f"{i + 1}°")


def _nombres_letras(n: int) -> list[str]:
    if n <= 26:
        return list("abcdefghijklmnopqrstuvwxyz"[:n])
    return [f"x{_sub(i + 1)}" for i in range(n)]


def _nombres_subindice(n: int) -> list[str]:
    return [f"x{_sub(i + 1)}" for i in range(n)]


def _nombres_xyz(n: int) -> list[str]:
    if n == 3:
        return ["x", "y", "z"]
    if n == 2:
        return ["x", "y"]
    return _nombres_subindice(n)


def _validar_variables(variables: Sequence[str] | None, n: int, defecto: list[str]) -> list[str]:
    if not variables:
        return defecto
    nombres = [v.strip() for v in variables]
    if len(nombres) != n:
        raise ErrorMetodo(f"Se esperaban {n} nombres de variables y se recibieron {len(nombres)}")
    if any(not v for v in nombres):
        raise ErrorMetodo("Los nombres de las variables no pueden estar vacíos")
    if len(set(nombres)) != n:
        raise ErrorMetodo("Los nombres de las variables deben ser distintos")
    return nombres


def _validar_matriz(matriz: Sequence[Sequence]) -> int:
    """Matriz aumentada [A|b]: n renglones de n + 1 elementos. Devuelve n."""
    n = len(matriz)
    if n < 2:
        raise ErrorMetodo("El sistema debe tener al menos 2 ecuaciones")
    for i, fila in enumerate(matriz):
        if len(fila) != n + 1:
            raise ErrorMetodo(
                f"El renglón {i + 1} debe tener {n + 1} elementos (coeficientes y término "
                f"independiente) y tiene {len(fila)}"
            )
    return n


def _sistema_original(A: Sequence[Sequence[Fraction]], nombres: list[str]) -> Paso:
    n = len(A)
    return Paso("Sistema de ecuaciones", _aligned([_ecuacion(f[:n], f[n], nombres, _fr) for f in A]))


def _intercambio(M: list[list[Fraction]], k: int, r: ResultadoNumerico) -> bool:
    """Elemento pivote cero: intercambia de posición dos ecuaciones (op. de renglón 3, p.34).

    Devuelve False si no hay renglón inferior con elemento distinto de cero (sistema singular).
    """
    otro = next((i for i in range(k + 1, len(M)) if M[i][k] != 0), None)
    if otro is None:
        return False
    M[k], M[otro] = M[otro], M[k]
    texto = (f"El elemento pivote del {_ordinal_renglon(k)} renglón es cero: se intercambian de "
             f"posición el {_ordinal_renglon(k)} y el {_ordinal_renglon(otro)} renglón")
    r.advertencias.append(texto)
    r.pasos.append(Paso("Intercambiar de posición dos ecuaciones",
                        rf"\text{{{_ordinal_renglon(k)} renglón}} \leftrightarrow "
                        rf"\text{{{_ordinal_renglon(otro)} renglón}}"))
    return True


def _singular(k: int) -> ErrorMetodo:
    return ErrorMetodo(
        f"Sistema singular: no hay elemento pivote distinto de cero en la columna {k + 1} "
        "(el determinante es cero; el sistema no tiene solución única)"
    )


def _comprobacion(
    A: Sequence[Sequence[Fraction]],
    valores: Sequence[Fraction],
    textos: Sequence[str],
    r: ResultadoNumerico,
) -> None:
    """Comprobación: sustituir los valores en las ecuaciones originales (p.31, 33, 35)."""
    n = len(A)
    lineas: list[str] = []
    for fila in A:
        terminos = []
        for c, t in zip(fila[:n], textos):
            if c == 0:
                continue
            mag = _fr(abs(c))
            terminos.append((c < 0, f"{'' if mag == '1' else mag}({t})"))
        lado_izq = sum((c * v for c, v in zip(fila[:n], valores)), Fraction(0))
        lineas.append(rf"{_suma(terminos)} = {_fr(fila[n])} \\ {_fr(lado_izq)} = {_fr(fila[n])}")
    r.pasos.append(Paso("Comprobación",
                        r"\begin{aligned}" + r" \\[6pt] ".join(lineas) + r"\end{aligned}"))


# --------------------------------------------------------------------------------------------
# Montante (p.29–31)
# --------------------------------------------------------------------------------------------
def montante(
    matriz: Sequence[Sequence[str | Fraction]],
    variables: Sequence[str] | None = None,
    decimales: int = DECIMALES_LIBRO,
) -> ResultadoNumerico:
    """Montante: N.E = ((E.P)(E.A) - (E.C.F.P)(E.C.C.P)) / P.A, iniciando con pivote anterior 1.

    a) La fila del pivote se transfiere idéntica. b) La columna del pivote queda en ceros excepto
    la diagonal principal. Al final la diagonal es el determinante y cada variable es
    término independiente / determinante.
    """
    n = _validar_matriz(matriz)
    A = [[fraccion(x) for x in fila] for fila in matriz]
    nombres = _validar_variables(variables, n, _nombres_letras(n))
    r = ResultadoNumerico(metodo="montante", nombre_libro="Montante", pagina=29)
    r.pasos.append(_sistema_original(A, nombres))
    r.pasos.append(Paso("Fórmula",
                        r"N.E = \frac{(E.P)(E.A) - (E.C.F.P)(E.C.C.P)}{P.A}"))

    M = [fila[:] for fila in A]
    pivote_anterior = Fraction(1)
    signo = 1
    for k in range(n):
        if M[k][k] == 0:
            if not _intercambio(M, k, r):
                raise _singular(k)
            signo = -signo
        ep = M[k][k]
        r.matrices.append(Matriz(f"Elemento pivote = {_fr(ep)}", _texto_matriz(M), (k, k),
                                 f"Pivote = {_fr(pivote_anterior)}"))
        nueva = [[Fraction(0)] * (n + 1) for _ in range(n)]
        lineas: list[str] = []
        for i in range(n):
            for j in range(n + 1):
                if i == k:
                    nueva[i][j] = M[i][j]  # la fila se transfiere idéntica
                elif j == k:
                    nueva[i][j] = Fraction(0)  # la columna se hace cero
                else:
                    ne = (ep * M[i][j] - M[k][j] * M[i][k]) / pivote_anterior
                    nueva[i][j] = ne
                    lineas.append(
                        rf"\frac{{({_fr(ep)})({_fr(M[i][j])}) - ({_fr(M[k][j])})({_fr(M[i][k])})}}"
                        rf"{{{_fr(pivote_anterior)}}} = {_fr(ne)}"
                    )
        r.pasos.append(Paso(
            f"Pivote = {_fr(pivote_anterior)} (elemento pivote {_fr(ep)}): la fila pasa igual y "
            "la columna se hace cero",
            _aligned(lineas),
        ))
        M = nueva
        pivote_anterior = ep

    diagonal = M[0][0]
    determinante = diagonal * signo
    r.matrices.append(Matriz("Matriz final", _texto_matriz(M), None,
                             f"Determinante = {_fr(determinante)}"))

    valores: list[Fraction] = []
    textos: list[str] = []
    lineas = []
    for i, v in enumerate(nombres):
        termino, d = M[i][n], diagonal
        if d < 0:
            termino, d = -termino, -d
        valor = termino / d
        if termino.denominator == 1 and d.denominator == 1 and d != 1 and termino != 0:
            texto = f"{termino.numerator}/{d.numerator}"  # como el libro: 66/87 sin reducir
        else:
            texto = _fr(valor)
        valores.append(valor)
        textos.append(texto)
        lineas.append(f"{_vtex(v)} = {texto}")
        r.resultado[v] = texto
        r.resultado[f"{v} (decimal)"] = _dec(valor, decimales)
    r.resultado["Determinante"] = _fr(determinante)
    r.pasos.append(Paso("Cada variable = término independiente / determinante",
                        r"\boxed{" + _aligned(lineas) + "}"))
    _comprobacion(A, valores, textos, r)
    return r


# --------------------------------------------------------------------------------------------
# Gauss – Jordán (p.32–33)
# --------------------------------------------------------------------------------------------
def gauss_jordan(
    matriz: Sequence[Sequence[str | Fraction]],
    variables: Sequence[str] | None = None,
    decimales: int = DECIMALES_LIBRO,
) -> ResultadoNumerico:
    """Gauss – Jordán: la fila pivote se divide entre el elemento pivote y la columna se hace
    ceros; los demás términos: En = Ea - Eccp * Ecfp (Ecfp de la matriz que se está generando).
    """
    n = _validar_matriz(matriz)
    A = [[fraccion(x) for x in fila] for fila in matriz]
    nombres = _validar_variables(variables, n, _nombres_letras(n))
    r = ResultadoNumerico(metodo="gauss-jordan", nombre_libro="Gauss – Jordán", pagina=32)
    r.pasos.append(_sistema_original(A, nombres))
    r.pasos.append(Paso("Fórmula", r"En = Ea - Eccp \cdot Ecfp"))

    M = [fila[:] for fila in A]
    for k in range(n):
        if M[k][k] == 0 and not _intercambio(M, k, r):
            raise _singular(k)
        ep = M[k][k]
        r.matrices.append(Matriz(f"Pivote = {_fr(ep)}", _texto_matriz(M), (k, k),
                                 f"Pivote = {_fr(ep)}"))
        nueva = [[Fraction(0)] * (n + 1) for _ in range(n)]
        lineas: list[str] = []
        for j in range(n + 1):  # la fila pivote se divide entre el elemento pivote
            nueva[k][j] = M[k][j] / ep
            if j > k:
                lineas.append(f"({_fr(M[k][j])}) / ({_fr(ep)}) = {_fr(nueva[k][j])}")
        for i in range(n):
            if i == k:
                continue
            for j in range(n + 1):
                if j == k:
                    continue  # la columna se hace ceros
                ea, eccp, ecfp = M[i][j], M[i][k], nueva[k][j]
                nueva[i][j] = ea - eccp * ecfp
                if j > k:  # las columnas ya procesadas no cambian (Ecfp = 0)
                    lineas.append(f"{_fr(ea)} - {_fp(eccp)}({_fr(ecfp)}) = {_fr(nueva[i][j])}")
        r.pasos.append(Paso(
            f"Pivote = {_fr(ep)}: la fila pivote se divide entre el elemento pivote, la columna "
            "se hace ceros y En = Ea - Eccp · Ecfp",
            _aligned(lineas),
        ))
        M = nueva

    r.matrices.append(Matriz("Matriz identidad", _texto_matriz(M)))
    valores = [M[i][n] for i in range(n)]
    lineas = []
    for v, valor in zip(nombres, valores):
        r.resultado[v] = _fr(valor)
        r.resultado[f"{v} (decimal)"] = _dec(valor, decimales)
        lineas.append(f"{_vtex(v)} = {_fr(valor)}")
    r.pasos.append(Paso("Valores de las variables (última columna)",
                        r"\boxed{" + r"\quad ".join(lineas) + "}"))
    _comprobacion(A, valores, [_fr(x) for x in valores], r)
    return r


# --------------------------------------------------------------------------------------------
# Eliminación Gaussiana (p.34–35)
# --------------------------------------------------------------------------------------------
def eliminacion_gaussiana(
    matriz: Sequence[Sequence[str | Fraction]],
    variables: Sequence[str] | None = None,
    decimales: int = DECIMALES_LIBRO,
) -> ResultadoNumerico:
    """Eliminación Gaussiana: operaciones de renglón hasta la forma triangular y después
    sustitución hacia atrás."""
    n = _validar_matriz(matriz)
    A = [[fraccion(x) for x in fila] for fila in matriz]
    nombres = _validar_variables(variables, n, _nombres_subindice(n))
    r = ResultadoNumerico(metodo="eliminacion-gaussiana", nombre_libro="Eliminación Gaussiana",
                          pagina=34)
    r.pasos.append(_sistema_original(A, nombres))

    M = [fila[:] for fila in A]
    for k in range(n - 1):
        if M[k][k] == 0 and not _intercambio(M, k, r):
            raise _singular(k)
        for i in range(k + 1, n):
            if M[i][k] == 0:
                continue
            factor = M[i][k] / M[k][k]
            ner, mdo = _ordinal_renglon(k), _ordinal_renglon(i)
            r.matrices.append(Matriz(
                f"{ner} renglón * {_fr(factor)}", _texto_matriz(M), (k, k),
                f"{ner} renglón * {_fr(factor)}; {mdo} renglón – {ner} renglón",
            ))
            multiplo = [factor * x for x in M[k]]
            r.pasos.append(Paso(
                f"{ner} renglón * {_fr(factor)}",
                rf"\text{{{ner} renglón}} \cdot {_fp(factor)} = "
                + r",\; ".join(_fr(x) for x in multiplo),
            ))
            nuevo = [a - b for a, b in zip(M[i], multiplo)]
            r.pasos.append(Paso(
                f"{mdo} renglón – {ner} renglón",
                rf"\text{{{mdo} renglón}} - \text{{{ner} renglón}} = "
                + r",\; ".join(f"[{_fr(a)} - {_fp(b)}]" for a, b in zip(M[i], multiplo))
                + r" = " + r",\; ".join(_fr(x) for x in nuevo),
            ))
            M[i] = nuevo
    if M[n - 1][n - 1] == 0:
        raise _singular(n - 1)
    r.matrices.append(Matriz("Forma triangular", _texto_matriz(M), None, "Forma triangular"))

    # Sustitución hacia atrás ("Entonces:")
    valores: list[Fraction] = [Fraction(0)] * n
    for i in range(n - 1, -1, -1):
        v = _vtex(nombres[i])
        aii, bi = M[i][i], M[i][n]
        otros = [(j, M[i][j]) for j in range(i + 1, n) if M[i][j] != 0]
        lado = [(aii < 0, f"{_coef(_fr(abs(aii)))}{v}")]
        lado += [(c < 0, f"{_coef(_fr(abs(c)))}{_vtex(nombres[j])}") for j, c in otros]
        lineas = [f"{_suma(lado)} = {_fr(bi)}"]
        if otros:
            despeje = [(bi < 0, _fr(abs(bi)))] + [
                (c > 0, f"{_coef(_fr(abs(c)))}{_vtex(nombres[j])}") for j, c in otros
            ]
            sustitucion = [(bi < 0, _fr(abs(bi)))] + [
                (c > 0, _fp(valores[j]) if abs(c) == 1 else f"{_fr(abs(c))}({_fr(valores[j])})")
                for j, c in otros
            ]
            izq = f"{_coef(_fr(abs(aii)))}{v}" if aii > 0 else f"-{_coef(_fr(abs(aii)))}{v}"
            lineas.append(f"{izq} = {_suma(despeje)}")
            lineas.append(f"{izq} = {_suma(sustitucion)}")
            numerador = bi - sum((c * valores[j] for j, c in otros), Fraction(0))
            lineas.append(rf"{v} = \frac{{{_suma(sustitucion)}}}{{{_fr(aii)}}}")
            lineas.append(rf"{v} = \frac{{{_fr(numerador)}}}{{{_fr(aii)}}}")
        else:
            numerador = bi
            lineas.append(f"{v} = ({_fr(bi)}) / ({_fr(aii)})")
        valores[i] = numerador / aii
        lineas.append(rf"\boxed{{{v} = {_fr(valores[i])}}}")
        r.pasos.append(Paso(f"Entonces: despejando {nombres[i]}", _aligned(lineas)))

    for v, valor in zip(nombres, valores):
        r.resultado[v] = _fr(valor)
        r.resultado[f"{v} (decimal)"] = _dec(valor, decimales)
    _comprobacion(A, valores, [_fr(x) for x in valores], r)
    return r


# --------------------------------------------------------------------------------------------
# Gauss – Seidel (p.36–38) y Jacobi (p.39–41)
# --------------------------------------------------------------------------------------------
def _es_dominante(A: Sequence[Sequence[mpf]]) -> bool:
    n = len(A)
    return all(abs(A[i][i]) > sum(abs(A[i][j]) for j in range(n) if j != i) for i in range(n))


def _orden_dominante(A: Sequence[Sequence[mpf]]) -> list[int] | None:
    """Orden de las ecuaciones que deja la diagonal dominante, si existe.

    Cada renglón solo puede ser dominante en una columna (la de mayor valor absoluto).
    """
    n = len(A)
    asignado: dict[int, int] = {}
    for fila_i, fila in enumerate(A):
        for c in range(n):
            if abs(fila[c]) > sum(abs(fila[j]) for j in range(n) if j != c):
                if c in asignado:
                    return None
                asignado[c] = fila_i
                break
        else:
            return None
    return [asignado[c] for c in range(n)] if len(asignado) == n else None


def _orden_diagonal_no_cero(A: Sequence[Sequence[mpf]]) -> list[int] | None:
    """Orden con todos los elementos de la diagonal distintos de cero (para poder despejar)."""
    n = len(A)
    orden: list[int] = []
    usados: set[int] = set()

    def buscar(col: int) -> bool:
        if col == n:
            return True
        for f in range(n):
            if f not in usados and A[f][col] != 0:
                usados.add(f)
                orden.append(f)
                if buscar(col + 1):
                    return True
                usados.discard(f)
                orden.pop()
        return False

    return orden if buscar(0) else None


def _ordinal_iteracion(k: int) -> str:
    return {1: "1era.", 2: "2da.", 3: "3era."}.get(k, f"{k}a.")


def _iterativo(
    matriz: Sequence[Sequence[str | mpf]],
    variables: Sequence[str] | None,
    tolerancia: str | mpf,
    decimales: int,
    seidel: bool,
) -> ResultadoNumerico:
    d = decimales
    n = _validar_matriz(matriz)
    A0 = [[num(x) for x in fila] for fila in matriz]
    nombres = _validar_variables(variables, n, _nombres_xyz(n))
    epsilon = num(tolerancia)
    if epsilon <= 0:
        raise ErrorMetodo("El margen de error ε debe ser mayor que cero")
    if seidel:
        r = ResultadoNumerico(metodo="gauss-seidel", nombre_libro="Gauss – Seidel", pagina=36)
    else:
        r = ResultadoNumerico(metodo="jacobi", nombre_libro="Jacobi", pagina=39)

    def mag(x: mpf) -> str:
        return _fmt(x, d)

    r.pasos.append(Paso("Ecuaciones", _aligned(
        [rf"{i + 1})\; {_ecuacion(f[:n], f[n], nombres, mag)}" for i, f in enumerate(A0)])))

    # Diagonal Dominante (valores absolutos)
    if _es_dominante(A0):
        orden = list(range(n))
        numero = 1
    else:
        orden_dom = _orden_dominante(A0)
        if orden_dom is not None:
            orden = orden_dom
            numero = n + 1
            r.advertencias.append(
                "El sistema no tenía la diagonal dominante; se reordenaron las ecuaciones: "
                + ", ".join(str(i + 1) for i in orden)
            )
        else:
            r.advertencias.append(
                "El sistema no es diagonal dominante y no puede reordenarse para que lo sea; "
                f"se continúa, pero el método puede no converger (máximo {MAX_ITERACIONES} "
                "iteraciones)"
            )
            orden_nc = _orden_diagonal_no_cero(A0)
            if orden_nc is None:
                raise ErrorMetodo(
                    "No es posible despejar una variable de cada ecuación (el sistema es singular)"
                )
            orden = orden_nc
            numero = 1 if orden == list(range(n)) else n + 1
            if numero != 1:
                r.advertencias.append("Se reordenaron las ecuaciones para que la diagonal no "
                                      "tenga ceros")
    A = [A0[i] for i in orden]
    if numero != 1:
        r.pasos.append(Paso("Diagonal Dominante", _aligned(
            [rf"{numero + i})\; {_ecuacion(f[:n], f[n], nombres, mag)}" for i, f in enumerate(A)])))
    comprobacion = []
    for i, f in enumerate(A):
        suma = " + ".join(mag(abs(f[j])) for j in range(n) if j != i)
        otros = sum(abs(f[j]) for j in range(n) if j != i)
        simbolo = ">" if abs(f[i]) > otros else r"\not>"
        comprobacion.append(rf"|{mag(f[i])}| {simbolo} {suma} = {mag(otros)}")
    r.pasos.append(Paso("Diagonal Dominante: cada elemento de la diagonal principal mayor que la "
                        "suma de los demás de su fila (valores absolutos)", _aligned(comprobacion)))
    r.pasos.append(Paso("Margen de error", rf"\varepsilon = {mag(epsilon)}"))

    # Despejes
    def numerador(i: int, valores: Sequence[mpf] | None) -> str:
        f = A[i]
        terminos: list[tuple[bool, str]] = []
        if f[n] != 0:
            terminos.append((f[n] < 0, mag(abs(f[n]))))
        for j in range(n):
            if j == i or f[j] == 0:
                continue
            c = -f[j]
            m = mag(abs(c))
            if valores is None:
                terminos.append((c < 0, f"{_coef(m)}{_vtex(nombres[j])}"))
            else:
                v = valores[j]
                terminos.append((c < 0, (f"({_fmt(v, d)})" if v < 0 else _fmt(v, d)) if m == "1" else f"{m}({mag(v)})"))
        return _suma(terminos)

    def fraccion_tex(cuerpo: str, i: int) -> str:
        return cuerpo if A[i][i] == 1 else rf"\frac{{{cuerpo}}}{{{mag(A[i][i])}}}"

    base = (2 * n + 1) if numero != 1 else (n + 1)
    r.pasos.append(Paso(
        "Despejando " + ", ".join(f"“{nombres[i]}” de la ec.{numero + i}" for i in range(n)),
        _aligned([rf"{base + i})\; {_vtex(nombres[i])} = {fraccion_tex(numerador(i, None), i)}"
                  for i in range(n)]),
    ))

    inicial = mpf(0) if seidel else mpf(1)
    r.pasos.append(Paso(
        f"Se les asigna un valor de {'cero' if seidel else 'uno'} a todas las variables al iniciar",
        " = ".join(_vk_tex(v, 0) for v in nombres) + f" = {_fmt(inicial, d)}",
    ))
    r.columnas = [Columna("I", "I")] + [Columna(v, _vtex(v)) for v in nombres]
    actual = [inicial] * n
    r.filas.append({"I": "0", **{v: _fmt(x, d) for v, x in zip(nombres, actual)}})

    k = 0
    errores: list[mpf] = [mpf(0)] * n
    convergio = False
    while k < MAX_ITERACIONES:
        k += 1
        anterior = actual[:]
        nuevos = actual[:]  # Seidel usa de inmediato los valores nuevos
        for i in range(n):
            fuente = nuevos if seidel else anterior
            subindices = [(k if (seidel and j < i) else k - 1) for j in range(n)]
            usados = [f"{_vk_txt(nombres[j], subindices[j])} = {_fmt(fuente[j], d)}"
                      for j in range(n) if j != i and A[i][j] != 0]
            if i == 0:
                prefijo = f"{_ordinal_iteracion(k)} Iteración. Con "
            elif i == n - 1:
                prefijo = "Siendo "
            else:
                prefijo = "Considerando "
            if usados:
                lista = usados[0] if len(usados) == 1 else ", ".join(usados[:-1]) + " y " + usados[-1]
                descripcion = f"{prefijo}{lista}, obtener “{_vk_txt(nombres[i], k)}”"
            else:
                descripcion = f"{prefijo.removesuffix('Con ')}obtener “{_vk_txt(nombres[i], k)}”"
            suma = A[i][n] - sum((A[i][j] * fuente[j] for j in range(n) if j != i), mpf(0))
            valor = suma / A[i][i]
            nuevos[i] = valor
            r.pasos.append(Paso(
                descripcion,
                rf"{_vk_tex(nombres[i], k)} = {fraccion_tex(numerador(i, fuente), i)}"
                rf" = \boxed{{{_fmt(valor, d)}}}",
            ))
        actual = nuevos
        if not all(mpmath.isfinite(x) and abs(x) < mpf(10) ** 100 for x in actual):
            r.advertencias.append(f"El método diverge en la iteración {k}: los valores crecen sin "
                                  "límite")
            r.filas.append({"I": str(k), **{v: mpmath.nstr(x, 10) for v, x in zip(nombres, actual)}})
            break
        errores = [error_libro(nv, av) for nv, av in zip(actual, anterior)]
        r.errores.append(flt(max(errores)))
        r.filas.append({"I": str(k), **{v: _fmt(x, d) for v, x in zip(nombres, actual)}})
        if all(e < epsilon for e in errores):
            convergio = True
            break
    if not convergio and k >= MAX_ITERACIONES:
        r.advertencias.append(f"Se alcanzó el máximo de {MAX_ITERACIONES} iteraciones sin que el "
                              f"margen de error sea menor que {mag(epsilon)} en todas las variables")

    lineas = [
        rf"\varepsilon_{{{_vtex(v)}}} = |{_vk_tex(v, k)} - {_vk_tex(v, k - 1)}| = {_fmt(e, d)}"
        for v, e in zip(nombres, errores)
    ]
    r.pasos.append(Paso("Margen de error en todas las variables", _aligned(lineas)))
    r.resultado["I"] = str(k)
    for v, x in zip(nombres, actual):
        r.resultado[v] = _fmt(x, d)
    for v, e in zip(nombres, errores):
        r.resultado[f"ε{v}"] = _fmt(e, d)
    return r


def gauss_seidel(
    matriz: Sequence[Sequence[str | mpf]],
    variables: Sequence[str] | None = None,
    tolerancia: str | mpf = "0.001",
    decimales: int = DECIMALES_LIBRO,
) -> ResultadoNumerico:
    """Gauss – Seidel: inicia con cero y usa de inmediato el valor nuevo de cada variable."""
    return _iterativo(matriz, variables, tolerancia, decimales, seidel=True)


def jacobi(
    matriz: Sequence[Sequence[str | mpf]],
    variables: Sequence[str] | None = None,
    tolerancia: str | mpf = "0.001",
    decimales: int = DECIMALES_LIBRO,
) -> ResultadoNumerico:
    """Jacobi: inicia con uno y usa solo los valores de la iteración anterior."""
    return _iterativo(matriz, variables, tolerancia, decimales, seidel=False)


# --------------------------------------------------------------------------------------------
# Raíces de Polinomios (p.42–43)
# --------------------------------------------------------------------------------------------
def _poli_tex(coefs: Sequence[Fraction], var: str = "x") -> str:
    g = len(coefs) - 1
    terminos: list[tuple[bool, str]] = []
    for i, c in enumerate(coefs):
        if c == 0:
            continue
        k = g - i
        m = _fr(abs(c))
        if k == 0:
            terminos.append((c < 0, m))
        else:
            potencia = var if k == 1 else f"{var}^{{{k}}}"
            terminos.append((c < 0, f"{_coef(m)}{potencia}"))
    return _suma(terminos)


def _evaluar(coefs: Sequence[Fraction], x: Fraction) -> Fraction:
    total = Fraction(0)
    for c in coefs:  # Horner
        total = total * x + c
    return total


def _sustitucion_tex(coefs: Sequence[Fraction], x: Fraction) -> str:
    g = len(coefs) - 1
    terminos: list[tuple[bool, str]] = []
    for i, c in enumerate(coefs):
        if c == 0:
            continue
        k = g - i
        m = _fr(abs(c))
        if k == 0:
            terminos.append((c < 0, m))
        else:
            potencia = f"({_fr(x)})" if k == 1 else f"({_fr(x)})^{{{k}}}"
            terminos.append((c < 0, f"{'' if m == '1' else m}{potencia}"))
    return _suma(terminos)


def _divisores(n: int) -> list[int]:
    """Divisores ± de n > 0, en orden 1, -1, 2, -2, ..."""
    pequenos, grandes = [], []
    i = 1
    while i * i <= n:
        if n % i == 0:
            pequenos.append(i)
            if i != n // i:
                grandes.append(n // i)
        i += 1
    salida: list[int] = []
    for p in pequenos + grandes[::-1]:
        salida += [p, -p]
    return salida


def _division_sintetica(
    coefs: Sequence[Fraction], raiz: Fraction, r: ResultadoNumerico
) -> list[Fraction]:
    cociente = [coefs[0]]
    productos: list[Fraction] = []
    for c in coefs[1:]:
        p = raiz * cociente[-1]
        productos.append(p)
        cociente.append(c + p)
    residuo = cociente.pop()
    r.matrices.append(Matriz(
        f"División Sintética entre {_poli_tex([Fraction(1), -raiz])}",
        [[""] + [_fr(c) for c in coefs],
         [_fr(raiz), ""] + [_fr(p) for p in productos],
         [""] + [_fr(c) for c in cociente] + [_fr(residuo)]],
        (1, 0),
        f"x = {_fr(raiz)}",
    ))
    r.pasos.append(Paso(
        f"División Sintética entre (x - ({_fr(raiz)})); residuo = {_fr(residuo)}",
        rf"{_poli_tex(coefs)} = \left({_poli_tex([Fraction(1), -raiz])}\right)"
        rf"\left({_poli_tex(cociente)}\right)",
    ))
    return cociente


def _raiz_exacta(q: Fraction) -> Fraction | None:
    if q < 0:
        return None
    a, b = math.isqrt(q.numerator), math.isqrt(q.denominator)
    if a * a == q.numerator and b * b == q.denominator:
        return Fraction(a, b)
    return None


def raices_polinomios(
    coeficientes: Sequence[str | Fraction],
    decimales: int = DECIMALES_LIBRO,
) -> ResultadoNumerico:
    """Raíces de Polinomios: divisores del término independiente evaluados en f(x) (el que da
    cero es raíz), División Sintética para reducir el grado y Fórmula general en grado 2."""
    d = decimales
    coefs = [fraccion(c) for c in coeficientes]
    while coefs and coefs[0] == 0:
        coefs.pop(0)
    if len(coefs) < 2:
        raise ErrorMetodo("El polinomio debe ser al menos de grado 1 (coeficientes en orden "
                          "decreciente con respecto al grado)")
    original = coefs[:]
    r = ResultadoNumerico(metodo="raices-polinomios", nombre_libro="Raíces de Polinomios",
                          pagina=42)
    r.columnas = [Columna("grado", "Grado"), Columna("x", "x"), Columna("f(x)", "f(x)")]
    r.pasos.append(Paso(f"Polinomio de grado {len(coefs) - 1}", rf"f(x) = {_poli_tex(coefs)} = 0"))

    exactas: list[Fraction] = []
    otras: list[tuple[str, mpf | None]] = []  # (texto, valor real si aplica)

    P = coefs
    if len(P) - 1 > 2 and any(c.denominator != 1 for c in P):
        mcm = math.lcm(*(c.denominator for c in P))
        P = [c * mcm for c in P]
        r.pasos.append(Paso(f"Se multiplica f(x) por {mcm} para tener coeficientes enteros "
                            "(las raíces no cambian)", rf"{_poli_tex(P)} = 0"))

    while len(P) - 1 > 2:
        grado = len(P) - 1
        termino = P[-1]
        if termino == 0:
            r.pasos.append(Paso("El término independiente es cero: x = 0 es raíz",
                                rf"f(0) = {_sustitucion_tex(P, Fraction(0))} = 0"))
            r.filas.append({"grado": str(grado), "x": "0", "f(x)": "0"})
            raiz = Fraction(0)
        else:
            t = abs(termino.numerator)
            if t > MAX_TERMINO_INDEPENDIENTE:
                raise ErrorMetodo("El término independiente es demasiado grande para enumerar "
                                  "sus divisores")
            divisores = _divisores(t)
            r.pasos.append(Paso(f"Divisores del término independiente ({_fr(termino)})",
                                r"\pm " + r",\; \pm ".join(str(x) for x in divisores[::2])))
            lineas = []
            raiz = None
            for x in divisores:
                fx = _evaluar(P, Fraction(x))
                r.filas.append({"grado": str(grado), "x": str(x), "f(x)": _fr(fx)})
                lineas.append(rf"f({x}) = {_sustitucion_tex(P, Fraction(x))} = {_fr(fx)}")
                if fx == 0 and raiz is None:
                    raiz = Fraction(x)
            r.pasos.append(Paso("Evaluando cada divisor en f(x): el que da cero es raíz",
                                _aligned(lineas)))
            if raiz is None:
                encontradas = ", ".join(_fr(x) for x in exactas) or "ninguna"
                r.advertencias.append(
                    f"Ningún divisor del término independiente es raíz del polinomio de grado "
                    f"{grado} ({_poli_tex(P)}); raíces encontradas: {encontradas}"
                )
                break
        exactas.append(raiz)
        P = _division_sintetica(P, raiz, r)

    if len(P) - 1 == 2:
        a, b, c = P
        discriminante = b * b - 4 * a * c
        r.pasos.append(Paso("Fórmula general", r"x = \frac{-b \pm \sqrt{b^{2} - 4ac}}{2a}"))
        r.pasos.append(Paso(
            f"Sustituyendo a = {_fr(a)}, b = {_fr(b)}, c = {_fr(c)}",
            rf"x = \frac{{-({_fr(b)}) \pm \sqrt{{({_fr(b)})^{{2}} - 4({_fr(a)})({_fr(c)})}}}}{{2({_fr(a)})}}"
            rf" = \frac{{{_fr(-b)} \pm \sqrt{{{_fr(discriminante)}}}}}{{{_fr(2 * a)}}}",
        ))
        s = _raiz_exacta(discriminante)
        if s is not None:
            x1, x2 = (-b - s) / (2 * a), (-b + s) / (2 * a)
            exactas += sorted({x1, x2}) if x1 != x2 else [x1, x2]
            r.pasos.append(Paso("Respuestas", _aligned([f"x = {_fr(x1)}", f"x = {_fr(x2)}"])))
        elif discriminante > 0:
            raiz_d = mpmath.sqrt(mpf(discriminante.numerator) / discriminante.denominator)
            ma, mb = mpf(a.numerator) / a.denominator, mpf(b.numerator) / b.denominator
            for signo in (-1, 1):
                x = (-mb + signo * raiz_d) / (2 * ma)
                otras.append((_fmt(x, d), x))
            r.pasos.append(Paso("Respuestas", _aligned([f"x = {t}" for t, _ in otras])))
        else:
            ma, mb = mpf(a.numerator) / a.denominator, mpf(b.numerator) / b.denominator
            real = -mb / (2 * ma)
            imag = abs(mpmath.sqrt(-mpf(discriminante.numerator) / discriminante.denominator)
                       / (2 * ma))
            otras.append((f"{_fmt(real, d)} - {_fmt(imag, d)}i", None))
            otras.append((f"{_fmt(real, d)} + {_fmt(imag, d)}i", None))
            r.advertencias.append("El discriminante es negativo: las raíces restantes son "
                                  "complejas")
            r.pasos.append(Paso("Respuestas (complejas)",
                                _aligned([f"x = {t}" for t, _ in otras])))
    elif len(P) - 1 == 1:
        a, b = P
        x = -b / a
        exactas.append(x)
        r.pasos.append(Paso("Despejando x", rf"{_poli_tex(P)} = 0 \Rightarrow x = {_fr(x)}"))

    exactas_ordenadas = sorted(exactas)
    i = 0
    for x in exactas_ordenadas:
        i += 1
        clave = f"x{_sub(i)}"
        r.resultado[clave] = _fr(x)
        if x.denominator != 1:
            r.resultado[f"{clave} (decimal)"] = _dec(x, d)
    for texto, _ in otras:
        i += 1
        r.resultado[f"x{_sub(i)}"] = texto

    if exactas_ordenadas:
        r.pasos.append(Paso(
            "Comprobación: al sustituir cada valor de x en f(x) es igual a cero",
            _aligned([rf"f({_fr(x)}) = {_sustitucion_tex(original, x)} = "
                      rf"{_fr(_evaluar(original, x))}" for x in dict.fromkeys(exactas_ordenadas)]),
        ))

    reales = [mpf(x.numerator) / x.denominator for x in exactas] + [
        v for _, v in otras if v is not None
    ]
    mcoefs = [mpf(c.numerator) / c.denominator for c in original]

    def f(t: mpf) -> mpf:
        return mpmath.polyval(mcoefs, t)

    lo, hi = margen(reales) if reales else (mpf(-5), mpf(5))
    r.series.append(Serie(f"f(x) = {_poli_tex(original)}", "linea", muestrear(f, lo, hi)))
    if reales:
        r.series.append(Serie("Raíces", "puntos", [(flt(x), 0.0) for x in reales]))
    return r
