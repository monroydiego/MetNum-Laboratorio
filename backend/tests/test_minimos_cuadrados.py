"""Unidad II · 4 Mínimos Cuadrados — ejemplo del libro (Línea Recta, p.46–47) y referencias mpmath.

El libro solo resuelve la Línea Recta; para Cuadrática, Cúbica, Lineal con Función y Cuadrática con
Función se usan datos propios y se compara contra el sistema normal resuelto con mpmath.lu_solve a 50 cifras.
"""
import mpmath
import pytest

from tests.conftest import cerca

X_LIBRO = ["1.1", "1.9", "2.4", "4.8", "5.1", "10.5"]
Y_LIBRO = ["2.5", "2.7", "3.7", "5.2", "6.0", "8.3"]

# Datos propios (sin ejemplo en el libro)
X_PROPIO = ["0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4"]
Y_PROPIO = ["1.2", "1.9", "3.1", "4.4", "6.3", "8.1", "10.9", "13.6"]


def _referencia(x: list[str], y: list[str], base) -> list[mpmath.mpf]:
    """Resuelve el sistema normal Σφᵢφⱼ · a = Σyφᵢ con mpmath.lu_solve (50 cifras)."""
    xs = [mpmath.mpf(v) for v in x]
    ys = [mpmath.mpf(v) for v in y]
    m = len(base)
    A = mpmath.matrix(m, m)
    b = mpmath.matrix(m, 1)
    for i in range(m):
        for j in range(m):
            A[i, j] = mpmath.fsum(base[i](t) * base[j](t) for t in xs)
        b[i] = mpmath.fsum(base[i](t) * yt for t, yt in zip(xs, ys))
    sol = mpmath.lu_solve(A, b)
    return [sol[i] for i in range(m)]


def _post(cliente, slug: str, **cuerpo):
    return cliente.post(f"/api/calcular/{slug}", json=cuerpo)


def _a_completos(cliente, slug: str, **cuerpo) -> list[str]:
    """Coeficientes con 20 decimales para comparar contra mpmath con tolerancia estricta."""
    r = _post(cliente, slug, decimales=20, **cuerpo)
    assert r.status_code == 200, r.text
    res = r.json()["resultado"]
    return [res[k] for k in sorted(k for k in res if k.startswith("a_"))]


# ------------------------------------------------------------------ Línea Recta (libro p.46–47)
def test_linea_recta_ejemplo_libro(cliente):
    r = _post(cliente, "linea-recta", x=X_LIBRO, y=Y_LIBRO)
    assert r.status_code == 200, r.text
    datos = r.json()
    assert datos["nombre_libro"] == "Línea Recta"
    assert datos["pagina"] == 46

    # Tabla x | y | x² | xy con fila de sumatorias
    claves = [c["clave"] for c in datos["columnas"]]
    assert claves == ["fila", "x", "y", "x2", "xy"]
    suma = datos["filas"][-1]
    assert suma["fila"] == "Σ"
    assert cerca(suma["x"], "25.8") and cerca(suma["y"], "28.4")
    assert cerca(suma["x2"], "169.88") and cerca(suma["xy"], "159.47")
    assert [f["x2"] for f in datos["filas"][:-1]] == ["1.21", "3.61", "5.76", "23.04", "26.01", "110.25"]
    assert [f["xy"] for f in datos["filas"][:-1]] == ["2.75", "5.13", "8.88", "24.96", "30.6", "87.15"]

    # Matriz del libro y numérica
    simbolica, numerica = datos["matrices"][0]["filas"], datos["matrices"][1]["filas"]
    assert simbolica[0] == ["a_0", "a_1x", "g(x)"]
    assert numerica == [["6", "25.8", "28.4"], ["25.8", "169.88", "159.47"]]

    # Ecuaciones y eliminación como el libro
    latex = " ".join(p["latex"] for p in datos["pasos"])
    assert r"1)\; 6a_0 + 25.8a_1 = 28.4" in latex
    assert r"2)\; 25.8a_0 + 169.88a_1 = 159.47" in latex
    assert r"3)\; -25.8a_0 - 110.94a_1 = -122.12" in latex
    assert "58.94a_1 = 37.35" in latex
    assert any("-4.3" in p["descripcion"] for p in datos["pasos"])

    res = datos["resultado"]
    assert cerca(res["a_1"], "0.633695283")
    assert cerca(res["a_0"], "2.008443615")
    assert isinstance(res["a_0"], str)
    assert res["g(x)"] == "g(x) = 2.008443615 + 0.633695283x"

    # g(x) con cada valor de x (libro p.47)
    g_libro = ["2.705508427", "3.212464653", "3.529312295", "5.050180975", "5.240289560", "8.662244090"]
    puntos = next(s for s in datos["series"] if s["nombre"] == "[x, g(x)]")["puntos"]
    for (_, g), esperado in zip(puntos, g_libro):
        assert abs(g - float(esperado)) < 1e-9
    for esperado in g_libro:
        assert f"= {esperado.rstrip('0')}" in latex

    # Gráfica [x, y] y [x, g(x)]
    nombres = [s["nombre"] for s in datos["series"]]
    assert "[x, y]" in nombres and "[x, g(x)]" in nombres


def test_linea_recta_contra_mpmath(cliente):
    base = [lambda t: mpmath.mpf(1), lambda t: t]
    ref = _referencia(X_LIBRO, Y_LIBRO, base)
    obtenidos = _a_completos(cliente, "linea-recta", x=X_LIBRO, y=Y_LIBRO)
    for o, e in zip(obtenidos, ref):
        assert cerca(o, e, "1e-18")


def test_linea_recta_x_iguales(cliente):
    r = _post(cliente, "linea-recta", x=["2", "2", "2"], y=["1", "2", "3"])
    assert r.status_code == 422


# ------------------------------------------------------------------ Cuadrática y Cúbica (p.48)
def test_cuadratica_contra_mpmath(cliente):
    base = [lambda t: mpmath.mpf(1), lambda t: t, lambda t: t**2]
    ref = _referencia(X_PROPIO, Y_PROPIO, base)
    obtenidos = _a_completos(cliente, "cuadratica", x=X_PROPIO, y=Y_PROPIO)
    assert len(obtenidos) == 3
    for o, e in zip(obtenidos, ref):
        assert cerca(o, e, "1e-18")

    datos = _post(cliente, "cuadratica", x=X_PROPIO, y=Y_PROPIO).json()
    assert datos["nombre_libro"] == "Cuadrática" and datos["pagina"] == 48
    assert [c["clave"] for c in datos["columnas"]] == ["fila", "x", "y", "x2", "x3", "x4", "xy", "x2y"]
    assert datos["matrices"][0]["filas"][0] == ["a_0", "a_1x", "a_2x^{2}", "g(x)"]
    assert datos["matrices"][0]["filas"][3] == [r"\sum x^{2}", r"\sum x^{3}", r"\sum x^{4}", r"\sum x^{2}y"]
    assert any("Eliminación Gaussiana" in p["descripcion"] for p in datos["pasos"])


def test_cubica_contra_mpmath(cliente):
    base = [lambda t: mpmath.mpf(1), lambda t: t, lambda t: t**2, lambda t: t**3]
    ref = _referencia(X_PROPIO, Y_PROPIO, base)
    obtenidos = _a_completos(cliente, "cubica", x=X_PROPIO, y=Y_PROPIO)
    assert len(obtenidos) == 4
    for o, e in zip(obtenidos, ref):
        assert cerca(o, e, "1e-18")

    datos = _post(cliente, "cubica", x=X_PROPIO, y=Y_PROPIO).json()
    claves = [c["clave"] for c in datos["columnas"]]
    assert claves == ["fila", "x", "y", "x2", "x3", "x4", "x5", "x6", "xy", "x2y", "x3y"]
    assert datos["filas"][-1]["fila"] == "Σ"


def test_cubica_datos_libro_contra_mpmath(cliente):
    base = [lambda t: mpmath.mpf(1), lambda t: t, lambda t: t**2, lambda t: t**3]
    ref = _referencia(X_LIBRO, Y_LIBRO, base)
    obtenidos = _a_completos(cliente, "cubica", x=X_LIBRO, y=Y_LIBRO)
    for o, e in zip(obtenidos, ref):
        assert cerca(o, e, "1e-18")


# ------------------------------------------------------------------ Con Función (p.49)
@pytest.mark.parametrize(
    ("funcion", "f"),
    [
        ("Ln(x)", mpmath.log),
        ("e^x", mpmath.exp),
        ("sen(x)", mpmath.sin),
        ("cos(x)", mpmath.cos),
        ("tg(x)", mpmath.tan),
    ],
)
def test_lineal_con_funcion_contra_mpmath(cliente, funcion, f):
    base = [lambda t: mpmath.mpf(1), lambda t: t, f]
    ref = _referencia(X_PROPIO, Y_PROPIO, base)
    obtenidos = _a_completos(cliente, "lineal-con-funcion", x=X_PROPIO, y=Y_PROPIO, funcion=funcion)
    assert len(obtenidos) == 3
    for o, e in zip(obtenidos, ref):
        assert cerca(o, e, "1e-18")


def test_lineal_con_funcion_formato(cliente):
    datos = _post(cliente, "lineal-con-funcion", x=X_PROPIO, y=Y_PROPIO, funcion="Ln(x)").json()
    assert datos["nombre_libro"] == "Lineal con Función" and datos["pagina"] == 49
    assert [c["clave"] for c in datos["columnas"]] == ["fila", "x", "y", "x2", "fx", "xfx", "fx2", "xy", "yfx"]
    m = datos["matrices"][0]["filas"]
    assert m[0] == ["a_0", "a_1x", "a_2f(x)", "g(x)"]
    assert m[3] == [r"\sum f(x)", r"\sum x\,f(x)", r"\sum f(x)^{2}", r"\sum y\,f(x)"]
    assert "[Ln(x)]" in datos["resultado"]["g(x)"]


@pytest.mark.parametrize(
    ("funcion", "f"),
    [("Ln(x)", mpmath.log), ("e^x", mpmath.exp), ("sen(x)", mpmath.sin)],
)
def test_cuadratica_con_funcion_contra_mpmath(cliente, funcion, f):
    base = [lambda t: mpmath.mpf(1), lambda t: t, lambda t: t**2, f]
    ref = _referencia(X_PROPIO, Y_PROPIO, base)
    obtenidos = _a_completos(cliente, "cuadratica-con-funcion", x=X_PROPIO, y=Y_PROPIO, funcion=funcion)
    assert len(obtenidos) == 4
    for o, e in zip(obtenidos, ref):
        assert cerca(o, e, "1e-18")


def test_cuadratica_con_funcion_formato(cliente):
    datos = _post(cliente, "cuadratica-con-funcion", x=X_PROPIO, y=Y_PROPIO, funcion="e^x").json()
    assert datos["nombre_libro"] == "Cuadrática con Función"
    m = datos["matrices"][0]["filas"]
    assert m[0] == ["a_0", "a_1x", "a_2x^{2}", "a_3f(x)", "g(x)"]
    assert m[3] == [r"\sum x^{2}", r"\sum x^{3}", r"\sum x^{4}", r"\sum x^{2}\,f(x)", r"\sum x^{2}y"]


# ------------------------------------------------------------------ Casos borde
@pytest.mark.parametrize(
    ("slug", "n"),
    [("linea-recta", 1), ("cuadratica", 2), ("cubica", 3), ("lineal-con-funcion", 2), ("cuadratica-con-funcion", 3)],
)
def test_n_menor_que_coeficientes(cliente, slug, n):
    cuerpo = {"x": X_PROPIO[:n], "y": Y_PROPIO[:n]}
    if "funcion" in slug:
        cuerpo["funcion"] = "e^x"
    r = _post(cliente, slug, **cuerpo)
    assert r.status_code == 422
    assert "al menos" in r.text


def test_x_y_distinta_cantidad(cliente):
    assert _post(cliente, "linea-recta", x=["1", "2", "3"], y=["1", "2"]).status_code == 422


@pytest.mark.parametrize("x0", ["0", "-1"])
def test_ln_x_no_positivo(cliente, x0):
    for slug in ("lineal-con-funcion", "cuadratica-con-funcion"):
        r = _post(cliente, slug, x=[x0, "1", "2", "3", "4"], y=["1", "2", "3", "4", "5"], funcion="Ln(x)")
        assert r.status_code == 422, r.text
        assert "no está definida" in r.text


def test_funcion_dependiente_de_x_no_tiene_solucion_unica(cliente):
    """f(x) = 2x es combinación de a₀ y a₁x: el sistema no tiene solución única."""
    r = _post(cliente, "lineal-con-funcion", x=X_PROPIO, y=Y_PROPIO, funcion="2x")
    assert r.status_code == 422


def test_cuadratica_x_repetidos_sin_solucion_unica(cliente):
    r = _post(cliente, "cuadratica", x=["1", "1", "2", "2"], y=["1", "2", "3", "4"])
    assert r.status_code == 422


def test_catalogo_ejemplos_validos(cliente):
    metodos = {m["slug"]: m for m in cliente.get("/api/metodos").json()}
    for slug in ("linea-recta", "cuadratica", "cubica", "lineal-con-funcion", "cuadratica-con-funcion"):
        assert slug in metodos
        assert metodos[slug]["unidad"] == 2
        r = cliente.post(f"/api/calcular/{slug}", json=metodos[slug]["ejemplo"])
        assert r.status_code == 200, r.text
