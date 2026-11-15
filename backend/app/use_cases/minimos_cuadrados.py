"""Unidad II · 4 Mínimos Cuadrados (libro p.45–49).

Ajuste a: Línea Recta, Cuadrática, Cúbica, Lineal con Función, Cuadrática con Función.

- Tabla: x | y | x² | ... | xy | ... con una fila final de sumatorias (Σ); n = número de valores dados a x.
- Matriz del libro (encabezados a₀ | a₁x | ... | g(x)) y su versión numérica.
- "Ecuaciones:" 1), 2), ...
- Línea Recta: se resuelve como en el libro (p.46–47): ecuación 1 por el factor −Σx/n -> ecuación 3,
  sumar las ecuaciones 2 y 3, despejar a₁ y sustituir en la ecuación 1 para a₀.
- Las demás (el libro solo da la matriz, p.48–49): el sistema se resuelve con Eliminación Gaussiana
  (método del libro, p.34): operaciones de renglón hasta la forma triangular y sustitución hacia atrás.
- Encontrar g(x) con los valores de a₀, a₁, ... así como con cada valor de x, y graficar [x, y] y [x, g(x)].

El libro no define un margen de error para Mínimos Cuadrados, así que no se calcula ninguno.
"""
from collections.abc import Sequence
from dataclasses import dataclass

import mpmath
from mpmath import mpf

from app.domain.entities import Columna, Matriz, Paso, ResultadoNumerico, Serie
from app.domain.funciones import ErrorMetodo, FuncionUsuario
from app.use_cases._comun import DECIMALES_LIBRO, flt, fmt, margen, muestrear, tex

# Un término de la base se representa como (p, q) = x^p · f(x)^q.
Termino = tuple[int, int]

_BASE_LINEA_RECTA: list[Termino] = [(0, 0), (1, 0)]
_BASE_CUADRATICA: list[Termino] = [(0, 0), (1, 0), (2, 0)]
_BASE_CUBICA: list[Termino] = [(0, 0), (1, 0), (2, 0), (3, 0)]
_BASE_LINEAL_FUNCION: list[Termino] = [(0, 0), (1, 0), (0, 1)]
_BASE_CUADRATICA_FUNCION: list[Termino] = [(0, 0), (1, 0), (2, 0), (0, 1)]


# --------------------------------------------------------------------------- notación del libro
def _x_latex(p: int) -> str:
    return "" if p == 0 else ("x" if p == 1 else f"x^{{{p}}}")


def _f_latex(q: int) -> str:
    return "" if q == 0 else ("f(x)" if q == 1 else f"f(x)^{{{q}}}")


def _x_clave(p: int) -> str:
    return "" if p == 0 else ("x" if p == 1 else f"x{p}")


def _f_clave(q: int) -> str:
    return "" if q == 0 else ("fx" if q == 1 else f"fx{q}")


def _latex_producto(t: Termino) -> str:
    """x^p f(x)^q en LaTeX (x, x^{2}, f(x), x\\,f(x), f(x)^{2}); (0, 0) es n."""
    p, q = t
    partes = [s for s in (_x_latex(p), _f_latex(q)) if s]
    return r"\,".join(partes)


def _clave_producto(t: Termino) -> str:
    return _x_clave(t[0]) + _f_clave(t[1])


def _latex_producto_y(t: Termino) -> str:
    """y · x^p f(x)^q como lo escribe el libro: y, xy, x^{2}y, y\\,f(x)."""
    p, q = t
    texto = _x_latex(p) + "y"
    return texto + (r"\," + _f_latex(q) if q else "")


def _clave_producto_y(t: Termino) -> str:
    return _x_clave(t[0]) + "y" + _f_clave(t[1])


def _encabezado(k: int, t: Termino) -> str:
    """Encabezado de la columna del coeficiente a_k: a_0, a_1x, a_2x^{2}, a_3f(x)."""
    return f"a_{k}" + _latex_producto(t)


def _sumar(a: Termino, b: Termino) -> Termino:
    return (a[0] + b[0], a[1] + b[1])


def _orden_columna(t: Termino) -> tuple[int, int, int]:
    p, q = t
    return (0, p, 0) if q == 0 else (1, q, p)


# --------------------------------------------------------------------------- formato de ecuaciones
def _ecuacion(coeficientes: Sequence[mpf], independiente: mpf, d: int) -> str:
    """6a_0 + 25.8a_1 = 28.4 (signos como en el libro)."""
    texto = ""
    for k, c in enumerate(coeficientes):
        valor = fmt(c, d)
        if not texto:
            texto = f"{valor}a_{k}"
        elif valor.startswith("-"):
            texto += f" - {valor[1:]}a_{k}"
        else:
            texto += f" + {valor}a_{k}"
    return f"{texto} = {fmt(independiente, d)}"


def _g_texto(a: Sequence[mpf], base: Sequence[Termino], d: int, funcion: str = "función(x)") -> str:
    """g(x) = a₀ + a₁x + ... con los coeficientes obtenidos (texto plano)."""
    texto = ""
    for k, (coef, (p, q)) in enumerate(zip(a, base)):
        valor = fmt(coef, d)
        nombre = ("" if p == 0 else ("x" if p == 1 else f"x^{p}")) + (f"[{funcion}]" if q else "")
        if k == 0:
            texto = f"{valor}{nombre}"
        elif valor.startswith("-"):
            texto += f" - {valor[1:]}{nombre}"
        else:
            texto += f" + {valor}{nombre}"
    return f"g(x) = {texto}"


def _g_latex(a: Sequence[mpf], base: Sequence[Termino], d: int, funcion_latex: str) -> str:
    texto = ""
    for k, (coef, (p, q)) in enumerate(zip(a, base)):
        valor = fmt(coef, d)
        nombre = _x_latex(p) + (rf"\left[{funcion_latex}\right]" if q else "")
        if k == 0:
            texto = f"{valor}{nombre}"
        elif valor.startswith("-"):
            texto += f" - {valor[1:]}{nombre}"
        else:
            texto += f" + {valor}{nombre}"
    return f"g(x) = {texto}"


def _formula_g(base: Sequence[Termino]) -> str:
    partes = []
    for k, (p, q) in enumerate(base):
        partes.append(f"a_{k}" + _x_latex(p) + (r"\left[\text{función}(x)\right]" if q else ""))
    return "g(x) = " + " + ".join(partes)


# --------------------------------------------------------------------------- validación de datos
def _validar(x: Sequence[mpf], y: Sequence[mpf], coeficientes: int) -> None:
    if len(x) != len(y):
        raise ErrorMetodo(f"x tiene {len(x)} valores y y tiene {len(y)}: deben tener la misma cantidad")
    if len(x) < coeficientes:
        raise ErrorMetodo(
            f"Se necesitan al menos {coeficientes} valores de x para obtener {coeficientes} "
            f"coeficientes (n = {len(x)})"
        )


def _evaluar_funcion(funcion: FuncionUsuario, x: Sequence[mpf]) -> list[mpf]:
    valores: list[mpf] = []
    for xi in x:
        try:
            v = funcion(xi)
        except (ValueError, TypeError, ZeroDivisionError) as exc:
            raise ErrorMetodo(f"f(x) = {funcion.texto} no está definida en x = {fmt(xi)}") from exc
        if isinstance(v, mpmath.mpc) or not mpmath.isfinite(v):
            raise ErrorMetodo(f"f(x) = {funcion.texto} no está definida en x = {fmt(xi)}")
        valores.append(mpf(v))
    return valores


# --------------------------------------------------------------------------- tabla y matriz
@dataclass
class _Sistema:
    n: int
    sumas: dict[Termino, mpf]  # Σ x^p f(x)^q   ((0, 0) -> n)
    sumas_y: dict[Termino, mpf]  # Σ y x^p f(x)^q
    matriz: list[list[mpf]]  # matriz aumentada [coeficientes | g(x)]


def _producto(xi: mpf, fi: mpf | None, t: Termino) -> mpf:
    p, q = t
    valor = xi**p if p else mpf(1)
    if q:
        assert fi is not None
        valor *= fi**q
    return valor


def _tabla_y_matriz(
    r: ResultadoNumerico,
    x: Sequence[mpf],
    y: Sequence[mpf],
    fx: Sequence[mpf] | None,
    base: Sequence[Termino],
    d: int,
) -> _Sistema:
    n = len(x)
    productos = sorted(
        {_sumar(a, b) for a in base for b in base} - {(0, 0), (1, 0)}, key=_orden_columna
    )
    productos_y = [t for t in base if t != (0, 0)]

    r.columnas.append(Columna("fila", ""))
    r.columnas.append(Columna("x", "x"))
    r.columnas.append(Columna("y", "y"))
    for t in productos:
        r.columnas.append(Columna(_clave_producto(t), _latex_producto(t)))
    for t in productos_y:
        r.columnas.append(Columna(_clave_producto_y(t), _latex_producto_y(t)))

    sumas: dict[Termino, mpf] = {(0, 0): mpf(n)}
    sumas_y: dict[Termino, mpf] = {}
    todos = [(1, 0), *productos]
    for t in todos:
        sumas[t] = mpf(0)
    for t in base:
        sumas_y[t] = mpf(0)

    for i, (xi, yi) in enumerate(zip(x, y)):
        fi = fx[i] if fx is not None else None
        fila: dict[str, str | None] = {"fila": None, "x": fmt(xi, d), "y": fmt(yi, d)}
        for t in todos:
            v = _producto(xi, fi, t)
            sumas[t] += v
            if t != (1, 0):
                fila[_clave_producto(t)] = fmt(v, d)
        for t in base:
            v = yi * _producto(xi, fi, t)
            sumas_y[t] += v
            if t != (0, 0):
                fila[_clave_producto_y(t)] = fmt(v, d)
        r.filas.append(fila)

    fila_suma: dict[str, str | None] = {"fila": "Σ", "x": fmt(sumas[(1, 0)], d), "y": fmt(sumas_y[(0, 0)], d)}
    for t in productos:
        fila_suma[_clave_producto(t)] = fmt(sumas[t], d)
    for t in productos_y:
        fila_suma[_clave_producto_y(t)] = fmt(sumas_y[t], d)
    r.filas.append(fila_suma)

    # Matriz del libro (simbólica) y numérica
    encabezados = [_encabezado(k, t) for k, t in enumerate(base)] + ["g(x)"]
    simbolica = [encabezados]
    numerica: list[list[mpf]] = []
    for ti in base:
        renglon_sim = []
        renglon_num = []
        for tj in base:
            t = _sumar(ti, tj)
            renglon_sim.append("n" if t == (0, 0) else rf"\sum {_latex_producto(t)}")
            renglon_num.append(sumas[t])
        renglon_sim.append(rf"\sum {_latex_producto_y(ti)}")
        renglon_num.append(sumas_y[ti])
        simbolica.append(renglon_sim)
        numerica.append(renglon_num)

    r.matrices.append(
        Matriz("Matriz del libro", simbolica, nota="n.- es el número de valores dados a x")
    )
    r.matrices.append(Matriz("Matriz con las sumatorias", [[fmt(v, d) for v in fila] for fila in numerica]))

    sumas_txt = ",\\; ".join(
        [rf"\sum x = {fmt(sumas[(1, 0)], d)}", rf"\sum y = {fmt(sumas_y[(0, 0)], d)}"]
        + [rf"\sum {_latex_producto(t)} = {fmt(sumas[t], d)}" for t in productos]
        + [rf"\sum {_latex_producto_y(t)} = {fmt(sumas_y[t], d)}" for t in productos_y]
    )
    r.pasos.append(Paso("Sumatorias", sumas_txt))
    r.pasos.append(Paso("n.- es el número de valores dados a x", f"n = {n}"))
    for k, fila in enumerate(numerica, start=1):
        r.pasos.append(Paso("Ecuaciones:" if k == 1 else "", f"{k})\\; {_ecuacion(fila[:-1], fila[-1], d)}"))
    return _Sistema(n, sumas, sumas_y, numerica)


# --------------------------------------------------------------------------- Línea Recta (p.46–47)
def _resolver_linea_recta(r: ResultadoNumerico, s: _Sistema, d: int) -> list[mpf]:
    n = mpf(s.n)
    sx, sy = s.sumas[(1, 0)], s.sumas_y[(0, 0)]
    sx2, sxy = s.sumas[(2, 0)], s.sumas_y[(1, 0)]

    factor = -sx / n
    e3 = [n * factor, sx * factor, sy * factor]
    r.pasos.append(
        Paso(
            f"Multiplicar la ecuación 1 por el factor de {fmt(factor, d)} y se obtiene la siguiente ecuación 3.",
            f"3)\\; {_ecuacion(e3[:2], e3[2], d)}",
        )
    )
    c1 = sx2 + e3[1]
    b1 = sxy + e3[2]
    r.pasos.append(
        Paso(
            "Sumar las ecuaciones 2 y 3.",
            r"\begin{array}{l}"
            rf"{_ecuacion(e3[:2], e3[2], d)} \\ "
            rf"{_ecuacion([sx, sx2], sxy, d)} \\ \hline "
            rf"0a_0 + {fmt(c1, d)}a_1 = {fmt(b1, d)}"
            r"\end{array}",
        )
    )
    if abs(c1) <= mpf(10) ** (-40) * max(abs(sx2), mpf(1)):
        raise ErrorMetodo(
            "El coeficiente de a_1 es 0 al sumar las ecuaciones 2 y 3: todos los valores de x son iguales"
        )
    a1 = b1 / c1
    r.pasos.append(
        Paso("Despejando a₁", rf"a_1 = \frac{{{fmt(b1, d)}}}{{{fmt(c1, d)}}} \qquad \boxed{{a_1 = {fmt(a1, d)}}}")
    )

    producto = sx * a1
    resta = sy - producto
    a0 = resta / n
    r.pasos.append(
        Paso(
            "Entonces en la ecuación 1, se sustituye el valor de a₁ obtenido anteriormente para encontrar el de a₀.",
            r"\begin{aligned}"
            rf"&{fmt(n, d)}a_0 + {fmt(sx, d)}a_1 = {fmt(sy, d)} \\ "
            rf"&{fmt(n, d)}a_0 + {fmt(sx, d)}({fmt(a1, d)}) = {fmt(sy, d)} \\ "
            rf"&{fmt(n, d)}a_0 + {tex(producto, d)} = {fmt(sy, d)} \\ "
            rf"&{fmt(n, d)}a_0 = {fmt(sy, d)} - {tex(producto, d)} \\ "
            rf"&{fmt(n, d)}a_0 = {fmt(resta, d)} \\ "
            rf"&a_0 = {fmt(resta, d)} / {fmt(n, d)}"
            r"\end{aligned} \qquad "
            rf"\boxed{{a_0 = {fmt(a0, d)}}}",
        )
    )
    return [a0, a1]


# --------------------------------------------------------------------------- Eliminación Gaussiana (p.34)
def _eliminacion_gaussiana(r: ResultadoNumerico, matriz: list[list[mpf]], d: int) -> list[mpf]:
    """Operaciones de renglón hasta la forma triangular y sustitución hacia atrás (método del libro)."""
    a = [list(fila) for fila in matriz]
    m = len(a)
    escala = max(abs(v) for fila in a for v in fila[:-1]) or mpf(1)
    tolerancia = escala * mpf(10) ** (-40)
    r.pasos.append(
        Paso(
            "Se resuelve el sistema de ecuaciones con Eliminación Gaussiana",
            "Operaciones de renglón hasta la forma triangular y sustitución hacia atrás",
        )
    )

    for k in range(m):
        if abs(a[k][k]) <= tolerancia:
            cambio = next((i for i in range(k + 1, m) if abs(a[i][k]) > tolerancia), None)
            if cambio is None:
                raise ErrorMetodo(
                    "El sistema de ecuaciones no tiene solución única (los datos no permiten "
                    "obtener todos los coeficientes)"
                )
            a[k], a[cambio] = a[cambio], a[k]
            r.pasos.append(
                Paso(
                    f"Intercambiar de posición los renglones {k + 1} y {cambio + 1}",
                    r"\text{renglón } " + f"{k + 1}" + r" \leftrightarrow \text{renglón } " + f"{cambio + 1}",
                )
            )
        for j in range(k + 1, m):
            if a[j][k] == 0:
                continue
            factor = a[j][k] / a[k][k]
            multiplo = [factor * v for v in a[k]]
            nuevo = [a[j][c] - multiplo[c] for c in range(m + 1)]
            nuevo[k] = mpf(0)
            r.pasos.append(
                Paso(
                    f"Renglón {k + 1} × ({fmt(factor, d)})",
                    ",\\; ".join(fmt(v, d) for v in multiplo),
                )
            )
            r.pasos.append(
                Paso(
                    f"Renglón {j + 1} − Renglón {k + 1} × ({fmt(factor, d)})",
                    ",\\; ".join(f"[{fmt(a[j][c], d)} - {tex(multiplo[c], d)}]" for c in range(m + 1))
                    + r" \;=\; "
                    + ",\\; ".join(fmt(v, d) for v in nuevo),
                )
            )
            a[j] = nuevo
        r.matrices.append(
            Matriz(
                f"Eliminación Gaussiana · columna {k + 1}",
                [[fmt(v, d) for v in fila] for fila in a],
                pivote=(k, k),
            )
        )

    if abs(a[m - 1][m - 1]) <= tolerancia:
        raise ErrorMetodo(
            "El sistema de ecuaciones no tiene solución única (los datos no permiten obtener todos los coeficientes)"
        )

    # Sustitución hacia atrás
    sol: list[mpf | None] = [None] * m
    for i in range(m - 1, -1, -1):
        conocidos = [(c, sol[c]) for c in range(i + 1, m)]
        suma = sum((a[i][c] * v for c, v in conocidos if v is not None), mpf(0))
        valor = (a[i][m] - suma) / a[i][i]
        sol[i] = valor
        lineas = [_ecuacion_parcial(a[i], i, m, d)]
        if conocidos:
            sustitucion = "".join(
                f" - {tex(a[i][c], d)}({fmt(v, d)})" for c, v in conocidos if v is not None
            )
            lineas.append(f"{fmt(a[i][i], d)}a_{i} = {fmt(a[i][m], d)}{sustitucion}")
            lineas.append(f"{fmt(a[i][i], d)}a_{i} = {fmt(a[i][m] - suma, d)}")
        lineas.append(rf"a_{i} = \frac{{{fmt(a[i][m] - suma, d)}}}{{{fmt(a[i][i], d)}}}")
        r.pasos.append(
            Paso(
                "Sustitución hacia atrás" if i == m - 1 else "",
                r"\begin{aligned}&" + r" \\ &".join(lineas) + r"\end{aligned} \qquad "
                + rf"\boxed{{a_{i} = {fmt(valor, d)}}}",
            )
        )
    return [v for v in sol if v is not None]


def _ecuacion_parcial(fila: Sequence[mpf], i: int, m: int, d: int) -> str:
    texto = f"{fmt(fila[i], d)}a_{i}"
    for c in range(i + 1, m):
        valor = fmt(fila[c], d)
        texto += f" - {valor[1:]}a_{c}" if valor.startswith("-") else f" + {valor}a_{c}"
    return f"{texto} = {fmt(fila[m], d)}"


# --------------------------------------------------------------------------- g(x) y gráfica
def _evaluar_g(a: Sequence[mpf], base: Sequence[Termino], xi: mpf, fi: mpf | None) -> mpf:
    return sum((c * _producto(xi, fi, t) for c, t in zip(a, base)), mpf(0))


def _cerrar(
    r: ResultadoNumerico,
    a: list[mpf],
    base: Sequence[Termino],
    x: Sequence[mpf],
    y: Sequence[mpf],
    fx: Sequence[mpf] | None,
    funcion: FuncionUsuario | None,
    d: int,
) -> None:
    subindices = "₀₁₂₃₄₅₆₇₈₉"
    nombres = ", ".join(f"a{subindices[k]}" for k in range(len(a)))
    lineas = []
    puntos_g: list[tuple[float, float]] = []
    for i, xi in enumerate(x):
        fi = fx[i] if fx is not None else None
        g = _evaluar_g(a, base, xi, fi)
        partes = []
        for k, (c, (p, q)) in enumerate(zip(a, base)):
            if k == 0:
                partes.append(fmt(c, d))
                continue
            factor = (f"({fmt(xi, d)})" if p == 1 else f"({fmt(xi, d)})^{{{p}}}" if p else "")
            if q:
                factor += f"({fmt(fi, d)})" if fi is not None else ""
            signo = " - " if fmt(c, d).startswith("-") else " + "
            partes.append(signo + fmt(c, d).lstrip("-") + factor)
        lineas.append("".join(partes) + f" = {fmt(g, d)}")
        puntos_g.append((flt(xi), flt(g)))
    r.pasos.append(
        Paso(
            f"Encontrar g(x) con los valores de {nombres} así como con cada valor de x.",
            r"\begin{aligned}&" + r" \\ &".join(lineas) + r"\end{aligned}",
        )
    )
    flatex = funcion.latex if funcion is not None else r"\text{función}(x)"
    r.pasos.append(Paso("Resultado", rf"\boxed{{{_g_latex(a, base, d, flatex)}}}"))
    r.pasos.append(
        Paso(
            "Por último se grafica en el mismo plano con las siguientes coordenadas:",
            r"1)\; [x,\, y] \qquad 2)\; [x,\, g(x)]",
        )
    )

    for k, c in enumerate(a):
        r.resultado[f"a_{k}"] = fmt(c, d)
    r.resultado["g(x)"] = _g_texto(a, base, d, funcion.texto if funcion is not None else "función(x)")

    def curva(t: mpf) -> mpf:
        ft = funcion(t) if funcion is not None else None
        if ft is not None and (isinstance(ft, mpmath.mpc) or not mpmath.isfinite(ft)):
            raise ValueError("fuera del dominio")
        return _evaluar_g(a, base, t, ft)

    lo, hi = margen(list(x))
    r.series.append(Serie("[x, y]", "puntos", [(flt(xi), flt(yi)) for xi, yi in zip(x, y)]))
    r.series.append(Serie("[x, g(x)]", "puntos", puntos_g))
    r.series.append(Serie(_g_texto(a, base, d, funcion.texto if funcion else "función(x)"), "linea",
                          muestrear(curva, lo, hi)))


# --------------------------------------------------------------------------- casos de uso
def _ajuste(
    slug: str,
    nombre_libro: str,
    pagina: int,
    base: list[Termino],
    x: Sequence[mpf],
    y: Sequence[mpf],
    funcion: FuncionUsuario | None,
    decimales: int,
) -> ResultadoNumerico:
    _validar(x, y, len(base))
    usa_funcion = any(q for _, q in base)
    if usa_funcion and funcion is None:
        raise ErrorMetodo("Falta la función(x) del ajuste (p. ej. e^x, sen(x), cos(x), tg(x), Ln(x))")
    fx = _evaluar_funcion(funcion, x) if usa_funcion and funcion is not None else None

    r = ResultadoNumerico(metodo=slug, nombre_libro=nombre_libro, pagina=pagina)
    r.pasos.append(Paso("Ecuación", _formula_g(base)))
    if usa_funcion and funcion is not None:
        r.pasos.append(Paso("Función (x)", f"f(x) = {funcion.latex}"))

    s = _tabla_y_matriz(r, x, y, fx, base, decimales)
    if base == _BASE_LINEA_RECTA:
        a = _resolver_linea_recta(r, s, decimales)
    else:
        a = _eliminacion_gaussiana(r, s.matriz, decimales)
    _cerrar(r, a, base, x, y, fx, funcion if usa_funcion else None, decimales)
    return r


def linea_recta(x: Sequence[mpf], y: Sequence[mpf], decimales: int = DECIMALES_LIBRO) -> ResultadoNumerico:
    """Línea Recta (p.46–47): g(x) = a₀ + a₁x."""
    return _ajuste("linea-recta", "Línea Recta", 46, _BASE_LINEA_RECTA, x, y, None, decimales)


def cuadratica(x: Sequence[mpf], y: Sequence[mpf], decimales: int = DECIMALES_LIBRO) -> ResultadoNumerico:
    """Cuadrática (p.48): g(x) = a₀ + a₁x + a₂x²."""
    return _ajuste("cuadratica", "Cuadrática", 48, _BASE_CUADRATICA, x, y, None, decimales)


def cubica(x: Sequence[mpf], y: Sequence[mpf], decimales: int = DECIMALES_LIBRO) -> ResultadoNumerico:
    """Cúbica (p.48): g(x) = a₀ + a₁x + a₂x² + a₃x³."""
    return _ajuste("cubica", "Cúbica", 48, _BASE_CUBICA, x, y, None, decimales)


def lineal_con_funcion(
    x: Sequence[mpf], y: Sequence[mpf], funcion: FuncionUsuario, decimales: int = DECIMALES_LIBRO
) -> ResultadoNumerico:
    """Lineal con Función (p.49): g(x) = a₀ + a₁x + a₂[función(x)]."""
    return _ajuste("lineal-con-funcion", "Lineal con Función", 49, _BASE_LINEAL_FUNCION, x, y, funcion, decimales)


def cuadratica_con_funcion(
    x: Sequence[mpf], y: Sequence[mpf], funcion: FuncionUsuario, decimales: int = DECIMALES_LIBRO
) -> ResultadoNumerico:
    """Cuadrática con Función (p.49): g(x) = a₀ + a₁x + a₂x² + a₃[función(x)]."""
    return _ajuste(
        "cuadratica-con-funcion", "Cuadrática con Función", 49, _BASE_CUADRATICA_FUNCION, x, y, funcion, decimales
    )
