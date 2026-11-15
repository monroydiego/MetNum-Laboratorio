"""Unidad I · 2 Solución de Ecuaciones no Lineales — ejemplos resueltos del libro (p.15–24).

Referencias independientes con mpmath a 50 cifras (mpmath.findroot solo se usa aquí, como
referencia; los métodos están programados desde cero en use_cases/raices.py).
"""
import mpmath
import pytest

from tests.conftest import cerca

mpmath.mp.dps = 50


def _post(cliente, slug: str, cuerpo: dict):
    return cliente.post(f"/api/calcular/{slug}", json=cuerpo)


def _ok(cliente, slug: str, cuerpo: dict) -> dict:
    r = _post(cliente, slug, cuerpo)
    assert r.status_code == 200, r.text
    return r.json()


# ------------------------------------------------------------------------------- Gráfico p.15


def test_grafico_ejemplo_libro(cliente):
    """y = x^3 - 6.5x + 2, X = -3..3: Y = -5.5, 7, 7.5, 2, -3.5, -3, 9.5."""
    datos = _ok(cliente, "grafico", {"funcion": "x^3 - 6.5x + 2", "a": "-3", "b": "3", "paso": "1"})
    assert datos["nombre_libro"] == "Gráfico"
    assert datos["pagina"] == 15
    assert [f["X"] for f in datos["filas"]] == ["-3", "-2", "-1", "0", "1", "2", "3"]
    assert [f["Y"] for f in datos["filas"]] == ["-5.5", "7", "7.5", "2", "-3.5", "-3", "9.5"]
    # El libro resalta 7, -3.5 y 9.5: el cambio de signo indica una raíz
    marcadas = [f["X"] for f in datos["filas"] if f["cambio"]]
    assert marcadas == ["-2", "1", "3"]
    assert datos["resultado"]["intervalos"] == "[-3, -2], [0, 1], [2, 3]"


def test_grafico_raiz_exacta_y_sin_cambio(cliente):
    datos = _ok(cliente, "grafico", {"funcion": "x^2 - 4", "a": "0", "b": "4", "paso": "1"})
    assert datos["resultado"]["raíces exactas"] == "2"
    datos = _ok(cliente, "grafico", {"funcion": "x^2 + 1", "a": "-2", "b": "2", "paso": "1"})
    assert datos["resultado"]["intervalos"] == "Ninguno"
    assert datos["advertencias"]


@pytest.mark.parametrize("cuerpo", [
    {"funcion": "x", "a": "0", "b": "1", "paso": "0"},
    {"funcion": "x", "a": "1", "b": "0", "paso": "1"},
    {"funcion": "x", "a": "0", "b": "100000", "paso": "1"},
])
def test_grafico_entradas_invalidas(cliente, cuerpo):
    assert _post(cliente, "grafico", cuerpo).status_code == 422


# ----------------------------------------------------------------------------- Bisectriz p.16


def test_bisectriz_ejemplo_libro_primeras_filas(cliente):
    """y = x^3 - 6.5x + 2 en [0, 1]. Solo las 4 primeras filas del libro son correctas
    (desde la fila 5 el libro tiene erratas: b = 0.3175 en vez de 0.3125)."""
    datos = _ok(cliente, "bisectriz", {"funcion": "x^3 - 6.5x + 2", "a": "0", "b": "1"})
    assert datos["nombre_libro"] == "Bisectriz"
    filas = datos["filas"]
    esperado = [("0", "1", "0.5", "-"), ("0", "0.5", "0.25", "+"),
                ("0.25", "0.5", "0.375", "-"), ("0.25", "0.375", "0.3125", "-")]
    for fila, (a, b, x, signo) in zip(filas, esperado):
        assert (fila["a"], fila["b"], fila["x"], fila["comportamiento"]) == (a, b, x, signo)
    # Fórmula del libro aplicada: fila 5 = (0.25 + 0.3125)/2
    assert filas[4]["b"] == "0.3125" and filas[4]["x"] == "0.28125"
    # Criterio Є = |x_{i+1} - x_i| <= 0.001
    res = datos["resultado"]
    assert float(res["Є"]) <= 0.001
    assert res["iteraciones"] == str(len(filas))
    assert len(datos["errores"]) == len(filas) - 1
    raiz = mpmath.findroot(lambda x: x**3 - mpmath.mpf("6.5") * x + 2, (0, 1), solver="bisect")
    assert abs(mpmath.mpf(res["x"]) - raiz) < mpmath.mpf("0.001")


def test_bisectriz_referencia_mpmath(cliente):
    """Iteración independiente a 50 cifras."""
    f = lambda x: x**3 - mpmath.mpf("6.5") * x + 2  # noqa: E731
    a, b = mpmath.mpf(0), mpmath.mpf(1)
    xs = []
    for _ in range(10):
        x = (a + b) / 2
        xs.append(x)
        if f(x) > 0:
            a = x
        else:
            b = x
    datos = _ok(cliente, "bisectriz", {"funcion": "x^3 - 6.5x + 2", "a": "0", "b": "1"})
    for fila, x in zip(datos["filas"], xs):
        assert cerca(fila["x"], x)


def test_bisectriz_intercambia_a_b(cliente):
    datos = _ok(cliente, "bisectriz", {"funcion": "x^3 - 6.5x + 2", "a": "1", "b": "0"})
    assert datos["filas"][0]["a"] == "0" and datos["filas"][0]["b"] == "1"
    assert any("intercambiaron" in a for a in datos["advertencias"])


def test_bisectriz_sin_cambio_de_signo(cliente):
    r = _post(cliente, "bisectriz", {"funcion": "x^2 + 1", "a": "0", "b": "1"})
    assert r.status_code == 422
    assert "signo" in r.json()["detail"].lower() or "signo" in r.text.lower()


def test_bisectriz_raiz_exacta_en_extremo(cliente):
    datos = _ok(cliente, "bisectriz", {"funcion": "x - 1", "a": "1", "b": "0"})
    assert datos["resultado"]["x"] == "1"


def test_bisectriz_max_iteraciones(cliente):
    datos = _ok(cliente, "bisectriz", {"funcion": "x^3 - 6.5x + 2", "a": "0", "b": "1",
                                       "tolerancia": "0", "max_iteraciones": 5})
    assert datos["resultado"]["iteraciones"] == "5"
    assert any("máximo" in a for a in datos["advertencias"])


# --------------------------------------------------------------- Punto Fijo p.17–18


def test_punto_fijo_ejemplo_libro(cliente):
    """y = 2x - e^x + 2, x = (e^x - 2)/2, x_0 = 0 (p.18)."""
    datos = _ok(cliente, "punto-fijo", {"funcion": "(e^x - 2)/2", "x0": "0"})
    assert datos["nombre_libro"] == "Punto Fijo ó Sustituciones Sucesivas"
    libro = {1: "-0.5", 2: "-0.69673467", 3: "-0.750895265", 4: "-0.764028075", 5: "-0.767106789",
             6: "-0.767822698", 7: "-0.767988857", 8: "-0.768027404", 9: "-0.768036346"}
    errores = {2: "0.19673467", 3: "0.054160595", 4: "0.01313281", 5: "0.003078714",
               6: "0.000715909", 7: "0.000166158", 8: "0.000038547", 9: "0.000008941"}
    filas = {int(f["i"]): f for f in datos["filas"]}
    assert len(filas) == 10  # i = 0..9: se detiene en Є = 0.000008941 < 0.00001
    for i, x in libro.items():
        assert cerca(filas[i]["x"], x), (i, filas[i]["x"])  # el libro trunca: ±1e-9
    for i, e in errores.items():
        assert cerca(filas[i]["error"], e), (i, filas[i]["error"])
    res = datos["resultado"]
    assert cerca(res["x"], "-0.768036346") and cerca(res["Є"], "0.000008941")
    assert res["iteraciones"] == "9"
    assert "e^{-0.5}" in filas[2]["g"]  # sustitución del valor anterior como en el libro


def test_punto_fijo_referencia_mpmath(cliente):
    g = lambda x: (mpmath.e**x - 2) / 2  # noqa: E731
    datos = _ok(cliente, "punto-fijo", {"funcion": "(e^x - 2)/2", "x0": "0", "tolerancia": "0",
                                        "decimales": 20})
    raiz = mpmath.findroot(lambda x: x - g(x), -0.77)
    assert abs(mpmath.mpf(datos["resultado"]["x"]) - raiz) < mpmath.mpf("1e-18")


def test_punto_fijo_divergente(cliente):
    """x = 2x^2 - 5 desde x_0 = 3 diverge (p.17, despeje a)."""
    r = _post(cliente, "punto-fijo", {"funcion": "2x^2 - 5", "x0": "3"})
    assert r.status_code == 422
    assert "diverge" in r.text


# ------------------------------------------------------------- Newton – Raphson p.19–20


def test_newton_raphson_ejemplo_libro(cliente):
    """f(x) = 0.8x^2 + x - 3, f'(x) = 1.6x + 1, x_0 = 1 (p.20)."""
    datos = _ok(cliente, "newton-raphson", {"funcion": "0.8x^2 + x - 3", "derivada": "1.6x + 1", "x0": "1"})
    assert datos["nombre_libro"] == "Newton – Raphson"
    filas = {int(f["i"]): f for f in datos["filas"]}
    libro = {1: ("1.461538462", "0.461538462"), 2: ("1.410492733", "0.051045728"),
             3: ("1.409852675", "0.000640057"), 4: ("1.409852575", "0.0000001")}
    for i, (x, e) in libro.items():
        assert cerca(filas[i]["x"], x) and cerca(filas[i]["error"], e), (i, filas[i])
    assert datos["resultado"]["iteraciones"] == "4"
    raiz = mpmath.findroot(lambda x: mpmath.mpf("0.8") * x**2 + x - 3, 1)
    assert cerca(datos["resultado"]["x"], raiz)


def test_newton_raphson_derivada_automatica(cliente):
    datos = _ok(cliente, "newton-raphson", {"funcion": "0.8x^2 + x - 3", "x0": "1"})
    assert cerca(datos["resultado"]["x"], "1.409852575")
    assert any("1.6" in p["latex"] for p in datos["pasos"] if p["descripcion"] == "Derivada")


def test_newton_raphson_derivada_cero(cliente):
    """f'(x_0) = 0: la tangente es horizontal (división entre cero)."""
    r = _post(cliente, "newton-raphson", {"funcion": "x^2 - 4", "x0": "0"})
    assert r.status_code == 422
    assert "f'" in r.text


def test_newton_raphson_max_iteraciones(cliente):
    """x^2 + 1 no tiene raíz real: no converge."""
    datos = _ok(cliente, "newton-raphson", {"funcion": "x^2 + 1", "x0": "0.5", "max_iteraciones": 20})
    assert datos["resultado"]["iteraciones"] == "20"
    assert any("máximo" in a for a in datos["advertencias"])


# ------------------------------------------------ Falsa Posición ó Regula – Falsi p.21–22


def test_falsa_posicion_ejemplo_libro(cliente):
    """f(x) = x e^x - 10, a = 1, b = 2 (p.22). b y f(b) son punto fijo."""
    datos = _ok(cliente, "falsa-posicion", {"funcion": "x e^x - 10", "a": "1", "b": "2"})
    assert datos["nombre_libro"] == "Falsa Posición ó Regula – Falsi"
    filas = {int(f["i"]): f for f in datos["filas"]}
    libro = {
        1: ("1", "1.603799386", "-7.281718172", None),
        2: ("1.603799386", "1.721776248", "-2.026091162", "0.117976862"),
        3: ("1.721776248", "1.741651888", "-0.367597181", "0.01987564"),
        4: ("1.741651888", "1.744898309", "-0.060806187", "0.003246421"),
        5: ("1.744898309", "1.745425782", "-0.009900159", "0.000527473"),
    }
    for i, (a, x, f_a, e) in libro.items():
        fila = filas[i]
        assert fila["b"] == "2"
        assert cerca(fila["a"], a) and cerca(fila["x"], x) and cerca(fila["f_a"], f_a), (i, fila)
        assert (fila["error"] is None) if e is None else cerca(fila["error"], e)
    # Errata del libro: f(b) = 4.778112190; el valor correcto es 2e^2 - 10 = 4.778112198
    assert cerca(filas[0]["f_b"], 2 * mpmath.e**2 - 10)
    res = datos["resultado"]
    assert cerca(res["x"], "1.745425782") and cerca(res["Є"], "0.000527473")
    assert res["iteraciones"] == "5"


def test_falsa_posicion_referencia_mpmath(cliente):
    datos = _ok(cliente, "falsa-posicion", {"funcion": "x e^x - 10", "a": "1", "b": "2",
                                            "tolerancia": "0", "decimales": 15, "max_iteraciones": 200})
    raiz = mpmath.findroot(lambda x: x * mpmath.e**x - 10, 1.7)
    assert abs(mpmath.mpf(datos["resultado"]["x"]) - raiz) < mpmath.mpf("1e-14")


def test_falsa_posicion_sin_cambio_de_signo(cliente):
    assert _post(cliente, "falsa-posicion", {"funcion": "x e^x - 10", "a": "2", "b": "3"}).status_code == 422


# ----------------------------------------------------------------------- Secante p.23–24


def test_secante_ejemplo_libro(cliente):
    """f(x) = e^{-x} - x, x_0 = 0, x_1 = 1 (p.24)."""
    datos = _ok(cliente, "secante", {"funcion": "e^(-x) - x", "x0": "0", "x1": "1"})
    assert datos["nombre_libro"] == "Secante"
    filas = {int(f["i"]): f for f in datos["filas"]}
    libro = {1: ("1", "1"), 2: ("0.612699836", "0.387300613"), 3: ("0.563838389", "0.048861447"),
             4: ("0.567170358", "0.003331969"), 5: ("0.567143306", "0.000027052")}
    for i, (x, e) in libro.items():
        assert cerca(filas[i]["x"], x), (i, filas[i])
        if i != 2:
            assert cerca(filas[i]["error"], e, "2e-9"), (i, filas[i])
    # Errata del libro (fila 2): escribe 0.387300613; |0.612699837 - 1| = 0.387300163
    assert cerca(filas[2]["error"], "0.387300163")
    res = datos["resultado"]
    assert cerca(res["x"], "0.567143306") and cerca(res["Є"], "0.00002705181386")
    assert res["iteraciones"] == "5"
    assert cerca(res["x"], mpmath.findroot(lambda x: mpmath.e**-x - x, 0.5), "1e-7")


def test_secante_referencia_mpmath(cliente):
    datos = _ok(cliente, "secante", {"funcion": "e^(-x) - x", "x0": "0", "x1": "1",
                                     "tolerancia": "0", "decimales": 30})
    raiz = mpmath.findroot(lambda x: mpmath.e**-x - x, 0.5)
    assert abs(mpmath.mpf(datos["resultado"]["x"]) - raiz) < mpmath.mpf("1e-29")


def test_secante_denominador_cero(cliente):
    """f(x_1) - f(x_0) = 0."""
    r = _post(cliente, "secante", {"funcion": "x^2 - 4", "x0": "-1", "x1": "1"})
    assert r.status_code == 422
    assert _post(cliente, "secante", {"funcion": "x", "x0": "1", "x1": "1"}).status_code == 422


# ----------------------------------------------------------------------------- Generales


@pytest.mark.parametrize("slug", ["grafico", "bisectriz", "punto-fijo", "newton-raphson",
                                  "falsa-posicion", "secante"])
def test_catalogo_ejemplos_validos(cliente, slug):
    metodos = {m["slug"]: m for m in cliente.get("/api/metodos").json()}
    assert slug in metodos
    datos = _ok(cliente, slug, metodos[slug]["ejemplo"])
    for valor in datos["resultado"].values():
        assert isinstance(valor, str)
    assert datos["series"]


def test_tolerancia_negativa(cliente):
    r = _post(cliente, "newton-raphson", {"funcion": "x - 1", "x0": "0", "tolerancia": "-1"})
    assert r.status_code == 422


def test_funcion_fuera_de_dominio(cliente):
    r = _post(cliente, "newton-raphson", {"funcion": "Ln(x)", "x0": "-1"})
    assert r.status_code == 422
