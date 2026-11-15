"""Unidad I · 1 Interpolación (libro p.3–14).

Métodos: Interpolación Lineal, Newton hacia Adelante, Newton hacia Atrás,
Newton con Diferencias Divididas, Lagrange. Variables y formato del libro.
"""
from collections.abc import Sequence

from mpmath import factorial, mpf

from app.domain.entities import Columna, Paso, ResultadoNumerico, Serie
from app.domain.funciones import ErrorMetodo, FuncionUsuario
from app.use_cases._comun import DECIMALES_LIBRO, flt, fmt, margen, muestrear, tex


def interpolacion_lineal(
    a: mpf,
    b: mpf,
    f_a: mpf,
    f_b: mpf,
    x: mpf,
    f_x: mpf | None = None,
    funcion: FuncionUsuario | None = None,
    decimales: int = DECIMALES_LIBRO,
) -> ResultadoNumerico:
    """1.1 Interpolación Lineal (p.4–5).

    g(x) = (f(b) - f(a)) / (b - a) · (x - a) + f(a)
    Margen de Error: Є = |f(x) - g(x)| = |valor real - valor calculado|
    """
    if a == b:
        raise ErrorMetodo("a y b deben ser distintos (b - a = 0)")

    d = decimales
    g = (f_b - f_a) / (b - a) * (x - a) + f_a

    r = ResultadoNumerico(metodo="interpolacion-lineal", nombre_libro="Interpolación Lineal", pagina=4)
    datos = rf"a = {tex(a, d)},\; b = {tex(b, d)},\; f(a) = {tex(f_a, d)},\; f(b) = {tex(f_b, d)},\; x = {tex(x, d)}"
    if f_x is not None:
        datos += rf",\; f(x) = {tex(f_x, d)}"
    r.pasos.append(Paso("Datos", datos))
    r.pasos.append(Paso("Fórmula", r"g(x) = \frac{f(b) - f(a)}{b - a}\,(x - a) + f(a)"))
    r.pasos.append(
        Paso(
            "Sustituyendo",
            rf"g(x) = \frac{{{tex(f_b, d)} - {tex(f_a, d)}}}{{{tex(b, d)} - {tex(a, d)}}}"
            rf"\,({tex(x, d)} - {tex(a, d)}) + {tex(f_a, d)}",
        )
    )
    r.pasos.append(Paso("Resultado", rf"\boxed{{g(x) = {fmt(g, d)}}}"))
    r.resultado["g(x)"] = fmt(g, d)

    if f_x is not None:
        error = abs(f_x - g)
        r.pasos.append(
            Paso(
                "Margen de Error",
                rf"Є = |f(x) - g(x)| = |{fmt(f_x, d)} - {fmt(g, d)}| = {fmt(error, d)}",
            )
        )
        r.resultado["Є"] = fmt(error, d)
        r.errores.append(flt(error))

    lo, hi = margen([a, b, x])
    if funcion is not None:
        r.series.append(Serie(f"f(x) = {funcion.texto}", "linea", muestrear(funcion, lo, hi)))
    recta = lambda t: (f_b - f_a) / (b - a) * (t - a) + f_a  # noqa: E731
    r.series.append(Serie("g(x)", "linea", muestrear(recta, lo, hi, 2)))
    r.series.append(Serie("Datos (a, f(a)), (b, f(b))", "puntos", [(flt(a), flt(f_a)), (flt(b), flt(f_b))]))
    r.series.append(Serie("(x, g(x))", "puntos", [(flt(x), flt(g))]))
    return r


# ---------------------------------------------------------------------------
# Helpers privados para los métodos con tabla de datos (x_i, y_i)
# ---------------------------------------------------------------------------

# Tolerancia para comparar intervalos h (las restas en mpf de decimales como 2.5 - 2.2 y
# 2.8 - 2.5 difieren en la cifra 50). Salvaguarda de implementación, no del libro.
_TOL_H = mpf("1e-30")


def _validar_datos(x: Sequence[mpf], y: Sequence[mpf]) -> None:
    if len(x) != len(y):
        raise ErrorMetodo("Las listas x_i y y_i deben tener la misma cantidad de puntos")
    if len(x) < 2:
        raise ErrorMetodo("Se requieren al menos 2 puntos (x_i, y_i)")
    for i in range(len(x)):
        for j in range(i + 1, len(x)):
            if x[i] == x[j]:
                raise ErrorMetodo(
                    f"x_{i + 1} y x_{j + 1} son iguales ({fmt(x[i])}): los valores de x_i no deben repetirse"
                )


def _pasos_h(x: Sequence[mpf], d: int) -> tuple[list[Paso], list[mpf]]:
    """h_i = |x_{i+1} - x_i| renglón por renglón (como en los ejemplos del libro)."""
    pasos: list[Paso] = []
    hs: list[mpf] = []
    for i in range(len(x) - 1):
        h = abs(x[i + 1] - x[i])
        hs.append(h)
        pasos.append(
            Paso(
                f"h_{i + 1}",
                rf"h_{{{i + 1}}} = |x_{{{i + 2}}} - x_{{{i + 1}}}| = |{fmt(x[i + 1], d)} - {tex(x[i], d)}| = {fmt(h, d)}",
            )
        )
    return pasos, hs


def _son_uniformes(hs: Sequence[mpf]) -> bool:
    escala = max(mpf(1), abs(hs[0]))
    return all(abs(h - hs[0]) <= _TOL_H * escala for h in hs)


def _lagrange(x: Sequence[mpf], y: Sequence[mpf], t: mpf) -> mpf:
    """Evalúa el polinomio de interpolación (único) en t; se usa solo para graficar g."""
    total = mpf(0)
    for i in range(len(x)):
        termino = y[i]
        for j in range(len(x)):
            if j != i:
                termino *= (t - x[j]) / (x[i] - x[j])
        total += termino
    return total


def _nota_entre(x: Sequence[mpf], y: Sequence[mpf], punto: mpf, d: int) -> Paso | None:
    """Nota del libro: 'g(x) se encuentra entre los valores y_a y y_b con respecto a "y"'."""
    for i in range(len(x) - 1):
        lo, hi = sorted((x[i], x[i + 1]))
        if lo <= punto <= hi:
            return Paso(
                "Nota",
                rf"g(x)\ \text{{se encuentra entre los valores}}\ {fmt(y[i], d)}\ \text{{y}}\ "
                rf"{fmt(y[i + 1], d)}\ \text{{con respecto a “y”}}",
            )
    return None


def _series(r: ResultadoNumerico, x: Sequence[mpf], y: Sequence[mpf], punto: mpf, g: mpf) -> None:
    lo, hi = margen([*x, punto])
    r.series.append(Serie("Datos (x_i, y_i)", "puntos", [(flt(a), flt(b)) for a, b in zip(x, y)]))
    r.series.append(Serie("g(x)", "linea", muestrear(lambda t: _lagrange(x, y, t), lo, hi)))
    r.series.append(Serie("(x, g(x))", "puntos", [(flt(punto), flt(g))]))


def _datos(x: Sequence[mpf], y: Sequence[mpf], punto: mpf, d: int) -> Paso:
    pares = r",\; ".join(
        rf"(x_{{{i + 1}}}, y_{{{i + 1}}}) = ({fmt(a, d)}, {fmt(b, d)})" for i, (a, b) in enumerate(zip(x, y))
    )
    return Paso("Datos", rf"{pares};\quad x = {fmt(punto, d)}")


def _encabezado_diferencia(simbolo: str, k: int) -> str:
    """Encabezados del libro: Δ´f(x_i), Δ²f(x_i)... / ∇´f(x_i), ∇²f(x_i)..."""
    return rf"{simbolo}' f(x_i)" if k == 1 else rf"{simbolo}^{{{k}}} f(x_i)"


def _nombre_diferencia(simbolo: str, k: int, i: int) -> str:
    """Δ´_1, Δ²_1, ∇´_3... (subíndice = renglón de la tabla, puntos indexados desde 1)."""
    return rf"{simbolo}'_{{{i}}}" if k == 1 else rf"{simbolo}^{{{k}}}_{{{i}}}"


def _tabla_diferencias(y: Sequence[mpf]) -> list[list[mpf]]:
    """tabla[k][i] = Δ^k f_i = Δ^{k-1} f_{i+1} - Δ^{k-1} f_i (k = 0 son las ordenadas)."""
    tabla = [list(y)]
    for k in range(1, len(y)):
        anterior = tabla[k - 1]
        tabla.append([anterior[i + 1] - anterior[i] for i in range(len(anterior) - 1)])
    return tabla


def _coeficiente_binomial_tex(k: int, s: mpf, signo: str, d: int) -> str:
    """Sustitución del coeficiente binomial del libro con s numérico.

    Adelante: S(S-1)...(S-k+1)/k!   ·   Atrás: S(S+1)...(S+k-1)/k!
    """
    if k == 0:
        return "(1)"
    if k == 1:
        return f"({fmt(s, d)})"
    factores = [f"({fmt(s, d)})"] + [f"({fmt(s, d)} {signo} {j})" for j in range(1, k)]
    return rf"\frac{{{''.join(factores)}}}{{{k}!}}"


def _coeficiente_binomial_formula(k: int, signo: str) -> str:
    if k == 0:
        return r"\binom{s}{0}"
    if k == 1:
        return r"\binom{s}{1}"
    factores = "s" + "".join(f"(s {signo} {j})" for j in range(1, k))
    return rf"\frac{{{factores}}}{{{k}!}}"


def _producto_binomial(s: mpf, k: int, signo: int) -> mpf:
    """S(S∓1)...(S∓(k-1)) / k!  (signo = -1 adelante, +1 atrás)."""
    producto = mpf(1)
    for j in range(k):
        producto *= s + signo * j
    return producto / factorial(k)


def _newton_uniforme(
    x: Sequence[mpf],
    y: Sequence[mpf],
    punto: mpf,
    decimales: int,
    *,
    adelante: bool,
) -> ResultadoNumerico:
    """Núcleo común de Newton hacia Adelante (p.6–8) y Newton hacia Atrás (p.9–10)."""
    _validar_datos(x, y)
    d = decimales
    n = len(x)
    if adelante:
        r = ResultadoNumerico(metodo="newton-adelante", nombre_libro="Newton hacia Adelante", pagina=6)
        simbolo, signo_txt, signo = r"\Delta", "-", -1
    else:
        r = ResultadoNumerico(metodo="newton-atras", nombre_libro="Newton hacia Atrás", pagina=9)
        simbolo, signo_txt, signo = r"\nabla", "+", 1

    r.pasos.append(_datos(x, y, punto, d))

    # 1) Obtener "h" y ver si es uniforme (Nota del libro).
    pasos_h, hs = _pasos_h(x, d)
    r.pasos.extend(pasos_h)
    if not _son_uniformes(hs):
        raise ErrorMetodo(
            "Los intervalos son no uniformes (h_i distintos): resuelve por Newton con Diferencias "
            "Divididas o por Lagrange"
        )
    crecientes = all(x[i + 1] > x[i] for i in range(n - 1))
    if not crecientes:
        if all(x[i + 1] < x[i] for i in range(n - 1)):
            # "Si no lo es se invierten los valores de x y y" (p.7).
            x, y = list(reversed(x)), list(reversed(y))
            r.advertencias.append(
                "Los datos venían de derecha a izquierda; se invirtieron los valores de “x” y “y” (p.7)."
            )
        else:
            raise ErrorMetodo("Los valores de x_i deben estar ordenados (intervalos uniformes)")
    h = hs[0]
    r.pasos.append(Paso("Intervalos", r"\boxed{\text{Los intervalos son uniformes}}"))
    r.resultado["h"] = fmt(h, d)

    # 2) Tabla de diferencias.
    tabla = _tabla_diferencias(y)
    r.columnas = [Columna("x", "x_i"), Columna("y", "y_i")] + [
        Columna(f"d{k}", _encabezado_diferencia(simbolo, k)) for k in range(1, n)
    ]
    for i in range(n):
        fila: dict[str, str | None] = {"x": fmt(x[i], d), "y": fmt(y[i], d)}
        for k in range(1, n):
            if adelante:
                # Δ^k f_i en el renglón i (alineada arriba).
                fila[f"d{k}"] = fmt(tabla[k][i], d) if i < n - k else None
            else:
                # ∇^k f_i = Δ^k f_{i-k}: alineada abajo (se usa el último renglón).
                fila[f"d{k}"] = fmt(tabla[k][i - k], d) if i >= k else None
        r.filas.append(fila)

    for k in range(1, n):
        for m in range(len(tabla[k])):
            # Adelante: renglón m+1 (Δ^k_{m+1}); Atrás: renglón m+k+1 (∇^k_{m+k+1}).
            fila_libro = m + 1 if adelante else m + k + 1
            nombre = _nombre_diferencia(simbolo, k, fila_libro)
            if k == 1:
                sup, inf = (rf"y_{{{m + 2}}}", rf"y_{{{m + 1}}}")
            else:
                sup = _nombre_diferencia(simbolo, k - 1, fila_libro + 1 if adelante else fila_libro)
                inf = _nombre_diferencia(simbolo, k - 1, fila_libro if adelante else fila_libro - 1)
            r.pasos.append(
                Paso(
                    f"Diferencia de orden {k}",
                    rf"{nombre} = {sup} - {inf} = {fmt(tabla[k - 1][m + 1], d)} - "
                    rf"{tex(tabla[k - 1][m], d)} = {fmt(tabla[k][m], d)}",
                )
            )

    # 3) Factor binomial "s".
    base = x[0] if adelante else x[-1]
    y_base = y[0] if adelante else y[-1]
    s = (punto - base) / h
    r.pasos.append(
        Paso(
            "Factor binomial “s”",
            rf"s = \frac{{x - x_i}}{{h}} = \frac{{{fmt(punto, d)} - {tex(base, d)}}}{{{fmt(h, d)}}}"
            rf"\qquad \boxed{{s = {fmt(s, d)}}}",
        )
    )
    r.resultado["s"] = fmt(s, d)
    if adelante and s < 0:
        r.advertencias.append("s es negativo: el libro indica que en Newton hacia Adelante s es siempre positivo.")
    if not adelante and s > 0:
        r.advertencias.append("s es positivo: el libro indica que en Newton hacia Atrás s es siempre negativo.")

    # 4) g(x) con el recuadro de trabajo del libro.
    coeficientes = [tabla[k][0] if adelante else tabla[k][-1] for k in range(n)]
    terminos_formula = ["y_i " + _coeficiente_binomial_formula(0, signo_txt)]
    terminos_sust = [f"{tex(y_base, d)} (1)"]
    g = mpf(0)
    for k in range(n):
        g += coeficientes[k] * _producto_binomial(s, k, signo)
        if k >= 1:
            terminos_formula.append(
                f"{_encabezado_diferencia(simbolo, k)} {_coeficiente_binomial_formula(k, signo_txt)}"
            )
            terminos_sust.append(f"({fmt(coeficientes[k], d)}) {_coeficiente_binomial_tex(k, s, signo_txt, d)}")
    r.pasos.append(Paso("Fórmula", "g(x) = " + " + ".join(terminos_formula)))
    r.pasos.append(Paso("Sustituyendo", "g(x) = " + " + ".join(terminos_sust)))
    r.pasos.append(Paso("Resultado", rf"\boxed{{g(x) = {fmt(g, d)}}}"))
    r.resultado["g(x)"] = fmt(g, d)
    nota = _nota_entre(x, y, punto, d)
    if nota:
        r.pasos.append(nota)
    _series(r, x, y, punto, g)
    return r


def newton_adelante(
    x: Sequence[mpf], y: Sequence[mpf], x_interpolar: mpf, decimales: int = DECIMALES_LIBRO
) -> ResultadoNumerico:
    """Newton hacia Adelante (p.6–8).

    h = |x_{i+1} - x_i| uniforme;  Δ^k f_i = Δ^{k-1} f_{i+1} - Δ^{k-1} f_i;  s = (x - x_i)/h
    g(x) = y_i (s 0) + Δ´f(x_i) (s 1) + Δ²f(x_i) s(s-1)/2! + ...   (x_i = primer punto)
    """
    return _newton_uniforme(x, y, x_interpolar, decimales, adelante=True)


def newton_atras(
    x: Sequence[mpf], y: Sequence[mpf], x_interpolar: mpf, decimales: int = DECIMALES_LIBRO
) -> ResultadoNumerico:
    """Newton hacia Atrás (p.9–10).

    s = (x - x_i)/h con x_i el último punto (s negativo)
    g(x) = y_i (s 0) + ∇´f(x_i) (s 1) + ∇²f(x_i) s(s+1)/2! + ...   (último renglón de la tabla)
    """
    return _newton_uniforme(x, y, x_interpolar, decimales, adelante=False)


def diferencias_divididas(
    x: Sequence[mpf], y: Sequence[mpf], x_interpolar: mpf, decimales: int = DECIMALES_LIBRO
) -> ResultadoNumerico:
    """Newton con Diferencias Divididas (p.11–12).

    D_1^1 = (y_2 - y_1)/(x_2 - x_1);  D_i^k = (D_{i+1}^{k-1} - D_i^{k-1}) / (x_{i+k} - x_i)
    g(x) = D^0 + D^1 (x - x_1) + D^2 (x - x_1)(x - x_2) + D^3 (x - x_1)(x - x_2)(x - x_3) + ...
    """
    _validar_datos(x, y)
    d = decimales
    n = len(x)
    punto = x_interpolar
    r = ResultadoNumerico(
        metodo="diferencias-divididas", nombre_libro="Newton con Diferencias Divididas", pagina=11
    )
    r.pasos.append(_datos(x, y, punto, d))
    pasos_h, hs = _pasos_h(x, d)
    r.pasos.extend(pasos_h)
    if len(hs) > 1 and _son_uniformes(hs):
        r.pasos.append(Paso("Intervalos", r"\boxed{\text{Los intervalos son uniformes}}"))
        r.advertencias.append(
            "Los intervalos son uniformes: también se puede resolver por Newton hacia Adelante o hacia Atrás."
        )
    else:
        r.pasos.append(Paso("Intervalos", r"\boxed{\text{Los intervalos son no uniformes}}"))

    # tabla[k][i] = D_{i+1}^k (k = 0: D^0 = y_i)
    tabla = [list(y)]
    for k in range(1, n):
        anterior = tabla[k - 1]
        tabla.append([(anterior[i + 1] - anterior[i]) / (x[i + k] - x[i]) for i in range(n - k)])

    r.columnas = [Columna("x", "x_i"), Columna("y", r"y_i\; D^0")] + [
        Columna(f"d{k}", rf"D^{{{k}}} f(x_i)") for k in range(1, n)
    ]
    for i in range(n):
        fila: dict[str, str | None] = {"x": fmt(x[i], d), "y": fmt(y[i], d)}
        for k in range(1, n):
            fila[f"d{k}"] = fmt(tabla[k][i], d) if i < n - k else None
        r.filas.append(fila)

    for k in range(1, n):
        for i in range(n - k):
            if k == 1:
                sup, inf = rf"y_{{{i + 2}}}", rf"y_{{{i + 1}}}"
            else:
                sup, inf = rf"D_{{{i + 2}}}^{{{k - 1}}}", rf"D_{{{i + 1}}}^{{{k - 1}}}"
            r.pasos.append(
                Paso(
                    f"Diferencia dividida de orden {k}",
                    rf"D_{{{i + 1}}}^{{{k}}} = \frac{{{sup} - {inf}}}{{x_{{{i + k + 1}}} - x_{{{i + 1}}}}}"
                    rf" = \frac{{{fmt(tabla[k - 1][i + 1], d)} - {tex(tabla[k - 1][i], d)}}}"
                    rf"{{{fmt(x[i + k], d)} - {tex(x[i], d)}}} = {fmt(tabla[k][i], d)}",
                )
            )

    formula = ["D^0"]
    sust = [f"({fmt(tabla[0][0], d)})"]
    g = tabla[0][0]
    producto = mpf(1)
    for k in range(1, n):
        producto *= punto - x[k - 1]
        g += tabla[k][0] * producto
        formula.append(rf"D_1^{{{k}}}" + "".join(rf"(x - x_{{{j + 1}}})" for j in range(k)))
        sust.append(
            f"({fmt(tabla[k][0], d)})" + "".join(f"({fmt(punto, d)} - {tex(x[j], d)})" for j in range(k))
        )
    r.pasos.append(Paso("Fórmula", "g(x) = " + " + ".join(formula)))
    r.pasos.append(Paso("Sustituyendo", "g(x) = " + " + ".join(sust)))
    r.pasos.append(Paso("Resultado", rf"\boxed{{g(x) = {fmt(g, d)}}}"))
    r.resultado["g(x)"] = fmt(g, d)
    nota = _nota_entre(x, y, punto, d)
    if nota:
        r.pasos.append(nota)
    _series(r, x, y, punto, g)
    return r


def lagrange(
    x: Sequence[mpf], y: Sequence[mpf], x_interpolar: mpf, decimales: int = DECIMALES_LIBRO
) -> ResultadoNumerico:
    """Lagrange (p.13–14). Intervalos uniformes y no uniformes.

    g(x) = Σ y_i Π_{j≠i} (x - x_j)/(x_i - x_j)
    """
    _validar_datos(x, y)
    d = decimales
    n = len(x)
    punto = x_interpolar
    r = ResultadoNumerico(metodo="lagrange", nombre_libro="Lagrange", pagina=13)
    r.pasos.append(_datos(x, y, punto, d))
    r.pasos.append(Paso("Fórmula", r"g(x) = \sum y_i \prod_{\substack{j=0 \\ j \neq i}}^{n} \frac{x - x_j}{x_i - x_j}"))

    g = mpf(0)
    for i in range(n):
        termino = y[i]
        num_f, den_f, num_s, den_s = [], [], [], []
        for j in range(n):
            if j == i:
                continue
            termino *= (punto - x[j]) / (x[i] - x[j])
            num_f.append(rf"(x - x_{{{j + 1}}})")
            den_f.append(rf"(x_{{{i + 1}}} - x_{{{j + 1}}})")
            num_s.append(f"({fmt(punto, d)} - {tex(x[j], d)})")
            den_s.append(f"({fmt(x[i], d)} - {tex(x[j], d)})")
        g += termino
        prefijo = "g(x) = " if i == 0 else "+ "
        r.pasos.append(
            Paso(
                f"Término de y_{i + 1}",
                rf"{prefijo}y_{{{i + 1}}} \frac{{{''.join(num_f)}}}{{{''.join(den_f)}}}"
                rf" = ({fmt(y[i], d)}) \frac{{{''.join(num_s)}}}{{{''.join(den_s)}}} = {fmt(termino, d)}",
            )
        )
    r.pasos.append(Paso("Resultado", rf"\boxed{{g(x) = {fmt(g, d)}}}"))
    r.resultado["g(x)"] = fmt(g, d)
    nota = _nota_entre(x, y, punto, d)
    if nota:
        r.pasos.append(nota)
    _series(r, x, y, punto, g)
    return r
