"""Unidad IV · 6 Ecuaciones Diferenciales Ordinarias — ejemplos resueltos del libro (p.62–73).

Cada método se compara contra:
1. el ejemplo del libro (±1e-9 salvo erratas documentadas),
2. la misma fórmula del libro calculada aparte con mpmath a 50 cifras,
3. la solución de referencia `mpmath.odefun` (solo cercanía: el método es una aproximación).
"""
import mpmath
import pytest
from mpmath import mpf

from tests.conftest import cerca

mpmath.mp.dps = 50


def _calcular(cliente, slug: str, cuerpo: dict) -> dict:
    r = cliente.post(f"/api/calcular/{slug}", json=cuerpo)
    assert r.status_code == 200, r.text
    return r.json()


def _odefun(f, y0: str, t1: str) -> mpf:
    """Solución de referencia de y' = f(y, t) (mpmath usa el orden (t, y))."""
    return mpmath.odefun(lambda t, y: f(y, t), 0, mpf(y0))(mpf(t1))


# ---------------------------------------------------------------------------
# Euler hacia Adelante (p.63–64)
# ---------------------------------------------------------------------------
def test_euler_adelante_ejemplo_libro(cliente):
    """3y' - 5yt + 1 = 0, y_0 = 2, h = 0.2 -> y_1 = 1.933333333, y_2 = 1.995555556."""
    datos = _calcular(cliente, "euler-adelante",
                      {"funcion": "(5yt - 1)/3", "y0": "2", "h": "0.2", "pasos": 2})
    assert datos["nombre_libro"] == "Euler hacia Adelante"
    assert datos["pagina"] == 63
    res = datos["resultado"]
    assert isinstance(res["y_1"], str)
    assert cerca(res["y_1"], "1.933333333")
    assert cerca(res["y_2"], "1.995555556")
    assert [f["t_n"] for f in datos["filas"]] == ["0", "0.2"]

    # Fórmula del libro con mpmath a 50 cifras
    f = lambda y, t: (5 * y * t - 1) / 3  # noqa: E731
    h = mpf("0.2")
    y1 = 2 + h * f(mpf(2), 0)
    y2 = y1 + h * f(y1, h)
    assert cerca(res["y_2"], y2)
    # Cercanía con la solución de referencia (Euler es de primer orden)
    assert abs(mpf(res["y_2"]) - _odefun(f, "2", "0.4")) < mpf("0.2")
    # Serie de puntos (t_n, y_n) para la gráfica
    assert datos["series"][0]["puntos"][-1][0] == pytest.approx(0.4)


# ---------------------------------------------------------------------------
# Euler hacia Atrás (p.65) — el libro no resuelve ejemplo: datos propios
# ---------------------------------------------------------------------------
def test_euler_atras_formula_con_y_siguiente_igual_a_y_n(cliente):
    """y_{n+1} = y_n + h f(y_{n+1}, t_{n+1}) con y_{n+1} = y_n dentro de f (decisión del usuario)."""
    datos = _calcular(cliente, "euler-atras",
                      {"funcion": "(5yt - 1)/3", "y0": "2", "h": "0.2", "pasos": 2})
    f = lambda y, t: (5 * y * t - 1) / 3  # noqa: E731
    h = mpf("0.2")
    y1 = 2 + h * f(mpf(2), h)  # = 2.066666667
    y2 = y1 + h * f(y1, 2 * h)
    res = datos["resultado"]
    assert cerca(res["y_1"], "2.066666667")
    assert cerca(res["y_1"], y1)
    assert cerca(res["y_2"], y2)
    assert datos["filas"][0]["t_n1"] == "0.2"


def test_euler_atras_con_y_siguiente_dado(cliente):
    datos = _calcular(cliente, "euler-atras",
                      {"funcion": "y + t", "y0": "1", "h": "0.1", "y_siguiente": "1.5"})
    # y_1 = 1 + 0.1 (1.5 + 0.1) = 1.16
    assert cerca(datos["resultado"]["y_1"], "1.16")
    assert datos["filas"][0]["y_arranque"] == "1.5"


# ---------------------------------------------------------------------------
# Euler Modificado (p.66)
# ---------------------------------------------------------------------------
def test_euler_modificado_ejemplo_libro(cliente):
    """2y' + 3yt + y = 0, y_0 = 1.2, h = 0.3, y_1 = 1.2 -> y'_1 = 0.939."""
    datos = _calcular(cliente, "euler-modificado",
                      {"funcion": "(-3yt - y)/2", "y0": "1.2", "h": "0.3", "y_siguiente": "1.2"})
    assert datos["nombre_libro"] == "Euler Modificado"
    res = datos["resultado"]
    assert cerca(res["y'_1"], "0.939")
    fila = datos["filas"][0]
    assert cerca(fila["f_n"], "-0.6")
    assert cerca(fila["f_n1"], "-1.14")
    f = lambda y, t: (-3 * y * t - y) / 2  # noqa: E731
    assert abs(mpf(res["y'_1"]) - _odefun(f, "1.2", "0.3")) < mpf("0.05")


def test_euler_modificado_sin_y_siguiente_usa_y_n(cliente):
    """Sin dato, el arranque es y_{n+1} = y_n (en el ejemplo coincide: y_1 = y_0 = 1.2)."""
    datos = _calcular(cliente, "euler-modificado",
                      {"funcion": "(-3yt - y)/2", "y0": "1.2", "h": "0.3", "pasos": 2})
    assert cerca(datos["resultado"]["y'_1"], "0.939")
    f = lambda y, t: (-3 * y * t - y) / 2  # noqa: E731
    y1 = mpf("0.939")
    h = mpf("0.3")
    y2 = y1 + h / 2 * (f(y1, h) + f(y1, 2 * h))
    assert cerca(datos["resultado"]["y'_2"], y2)


# ---------------------------------------------------------------------------
# Runge – Kutta de 2do orden (p.68)
# ---------------------------------------------------------------------------
def test_runge_kutta_2_ejemplo_libro(cliente):
    """y' - 2ty + 1 = 0, y_0 = 1, h = 0.6.

    ERRATA del libro: reporta k_2 = 0.303265329 y y_1 = 0.651632664 porque sustituye mal k_2
    (escribe 2(0.6)(0.4) - 1 y luego usa k_1 = -1 en y_1). Aplicando la fórmula del libro:
    k_1 = 0.6[2(0)(1) - 1] = -0.6;  k_2 = 0.6[2(0.6)(0.4) - 1] = -0.312;  y_1 = 1 + ½(-0.912) = 0.544.
    Decisión del usuario: se implementa la fórmula del libro.
    """
    datos = _calcular(cliente, "runge-kutta-2", {"funcion": "2ty - 1", "y0": "1", "h": "0.6"})
    assert datos["nombre_libro"] == "Runge – Kutta de 2do orden"
    fila = datos["filas"][0]
    assert cerca(fila["k_1"], "-0.6")
    assert cerca(fila["k_2"], "-0.312")
    assert cerca(datos["resultado"]["y_1"], "0.544")
    f = lambda y, t: 2 * t * y - 1  # noqa: E731
    assert abs(mpf(datos["resultado"]["y_1"]) - _odefun(f, "1", "0.6")) < mpf("0.15")


# ---------------------------------------------------------------------------
# Runge – Kutta de 3er orden (p.69)
# ---------------------------------------------------------------------------
def test_runge_kutta_3_ejemplo_libro(cliente):
    """y' = (2yt + 1)/y², y_0 = 1, h = 0.25 -> k_1 = 0.25, k_2 = 0.253086419, k_3 = 0.257939981.

    ERRATA del libro: y_1 = 1.211723276. Con sus propias k's,
    y_1 = 1 + 1/6[0.25 + 4(0.253086419) + 0.257939981] = 1.253380943.
    """
    datos = _calcular(cliente, "runge-kutta-3",
                      {"funcion": "(2yt + 1)/y^2", "y0": "1", "h": "0.25"})
    fila = datos["filas"][0]
    assert cerca(fila["k_1"], "0.25")
    assert cerca(fila["k_2"], "0.253086419")
    assert cerca(fila["k_3"], "0.257939981")
    assert cerca(datos["resultado"]["y_1"], "1.253380943")
    f = lambda y, t: (2 * y * t + 1) / y**2  # noqa: E731
    assert abs(mpf(datos["resultado"]["y_1"]) - _odefun(f, "1", "0.25")) < mpf("1e-5")


# ---------------------------------------------------------------------------
# Runge – Kutta de 4to orden por 1/3 de Simpson (p.70)
# ---------------------------------------------------------------------------
def test_runge_kutta_4_simpson_1_3_ejemplo_libro(cliente):
    """y' = (y + t)²/(1 - y), y = 0.4, h = 0.2 -> y_1 = 0.511617621."""
    datos = _calcular(cliente, "runge-kutta-4-simpson-1-3",
                      {"funcion": "(y + t)^2/(1 - y)", "y0": "0.4", "h": "0.2"})
    assert datos["nombre_libro"] == "Runge – Kutta de 4to orden por 1/3 de Simpson"
    fila = datos["filas"][0]
    assert cerca(fila["k_1"], "0.053333333")
    assert cerca(fila["k_2"], "0.096759689")
    assert cerca(fila["k_3"], "0.109031713")
    assert cerca(fila["k_4"], "0.204789590")
    assert cerca(datos["resultado"]["y_1"], "0.511617621")
    f = lambda y, t: (y + t) ** 2 / (1 - y)  # noqa: E731
    assert abs(mpf(datos["resultado"]["y_1"]) - _odefun(f, "0.4", "0.2")) < mpf("1e-3")


def test_runge_kutta_4_simpson_1_3_converge_a_mpmath(cliente):
    """Con h pequeña, el método del libro coincide con mpmath.odefun a ~10 cifras."""
    datos = _calcular(cliente, "runge-kutta-4-simpson-1-3",
                      {"funcion": "(5yt - 1)/3", "y0": "2", "h": "0.01", "pasos": 40,
                       "decimales": 20})
    f = lambda y, t: (5 * y * t - 1) / 3  # noqa: E731
    assert abs(mpf(datos["resultado"]["y_40"]) - _odefun(f, "2", "0.4")) < mpf("1e-9")


# ---------------------------------------------------------------------------
# Runge – Kutta de 4to orden por 3/8 de Simpson (p.71)
# ---------------------------------------------------------------------------
def test_runge_kutta_4_simpson_3_8_ejemplo_libro(cliente):
    """y' = -y/(y² + t), y_0 = 1, h = 0.5 -> y_1 = 0.552579997.

    k_3 se toma TAL CUAL el libro: h f(y_n + k_1/3 + k_2/3, t_n + 2/3 h).
    Discrepancia aritmética del libro en las k's (no en la fórmula):
      k_2 exacto = -15/31 = -0.483870968 (el libro escribe -0.483870959),
      k_3 = -0.428066429 (libro -0.428066426), k_4 = -0.343547843 (libro -0.343547869).
    Por eso las k's se comparan con ±3e-8; y_1 sí coincide a ±1e-9.
    """
    datos = _calcular(cliente, "runge-kutta-4-simpson-3-8",
                      {"funcion": "-y/(y^2 + t)", "y0": "1", "h": "0.5"})
    fila = datos["filas"][0]
    assert cerca(fila["k_1"], "-0.5")
    assert cerca(fila["k_2"], mpf(-15) / 31)
    assert cerca(fila["k_2"], "-0.483870959", tol="3e-8")
    assert cerca(fila["k_3"], "-0.428066426", tol="3e-8")
    assert cerca(fila["k_4"], "-0.343547869", tol="3e-8")
    assert cerca(datos["resultado"]["y_1"], "0.552579997")

    # Fórmula del libro con mpmath a 50 cifras
    f = lambda y, t: -y / (y**2 + t)  # noqa: E731
    h, y0 = mpf("0.5"), mpf(1)
    k1 = h * f(y0, 0)
    k2 = h * f(y0 + k1 / 3, h / 3)
    k3 = h * f(y0 + k1 / 3 + k2 / 3, 2 * h / 3)
    k4 = h * f(y0 + k1 - k2 + k3, h)
    y1 = y0 + (k1 + 3 * k2 + 3 * k3 + k4) / 8
    assert cerca(fila["k_4"], k4)
    assert cerca(datos["resultado"]["y_1"], y1)
    assert abs(mpf(datos["resultado"]["y_1"]) - _odefun(f, "1", "0.5")) < mpf("2e-3")


# ---------------------------------------------------------------------------
# Runge – Kutta de Orden Superior (p.72–73)
# ---------------------------------------------------------------------------
def test_runge_kutta_orden_superior_ejemplo_libro(cliente):
    """2y'' - 4y't - 2y = 0, y_0 = 1.1, y'_0 = 1.2, h = 0.2.

    ERRATA 1: el libro despeja y'' = 2y't - y (lo correcto sería 2y't + y). Decisión del usuario:
    se usa la y'' tal como la escribe el libro, en V, U, q: "2Vq - U".
    ERRATA 2: el recuadro dice m_2 = -0.1892, pero en y'_1 el libro usa -0.1896 (el correcto):
    m_2 = 0.2[2(1.2 - 0.22)(0.2) - (1.1 + 0.24)] = -0.1896.
    k_1 = 0.24, m_1 = -0.22, k_2 = 0.196, y_1 = 1.318, y'_1 = 0.9952.
    """
    datos = _calcular(cliente, "runge-kutta-orden-superior",
                      {"funcion": "2Vq - U", "y0": "1.1", "yp0": "1.2", "h": "0.2"})
    assert datos["nombre_libro"] == "Runge – Kutta de Orden Superior"
    fila = datos["filas"][0]
    assert cerca(fila["k_1"], "0.24")
    assert cerca(fila["m_1"], "-0.22")
    assert cerca(fila["k_2"], "0.196")
    assert cerca(fila["m_2"], "-0.1896")
    res = datos["resultado"]
    assert cerca(res["y_1"], "1.318")
    assert cerca(res["y'_1"], "0.9952")
    # Referencia: sistema U' = V, V' = 2Vq - U con mpmath.odefun
    sol = mpmath.odefun(lambda q, w: [w[1], 2 * w[1] * q - w[0]], 0, [mpf("1.1"), mpf("1.2")])
    u, v = sol(mpf("0.2"))
    assert abs(mpf(res["y_1"]) - u) < mpf("1e-2")
    assert abs(mpf(res["y'_1"]) - v) < mpf("1e-2")


def test_runge_kutta_orden_superior_varios_pasos(cliente):
    datos = _calcular(cliente, "runge-kutta-orden-superior",
                      {"funcion": "2Vq - U", "y0": "1.1", "yp0": "1.2", "h": "0.2", "pasos": 2})
    assert set(datos["resultado"]) == {"y_1", "y'_1", "y_2", "y'_2"}
    assert datos["filas"][1]["q_n"] == "0.2"
    assert datos["filas"][1]["U_n"] == "1.318"


# ---------------------------------------------------------------------------
# Casos borde
# ---------------------------------------------------------------------------
SLUGS_PRIMER_ORDEN = [
    "euler-adelante", "euler-atras", "euler-modificado", "runge-kutta-2", "runge-kutta-3",
    "runge-kutta-4-simpson-1-3", "runge-kutta-4-simpson-3-8",
]


@pytest.mark.parametrize("slug", SLUGS_PRIMER_ORDEN)
@pytest.mark.parametrize("h", ["0", "-0.1"])
def test_h_no_positiva(cliente, slug, h):
    r = cliente.post(f"/api/calcular/{slug}", json={"funcion": "y + t", "y0": "1", "h": h})
    assert r.status_code == 422


@pytest.mark.parametrize("slug", SLUGS_PRIMER_ORDEN + ["runge-kutta-orden-superior"])
def test_pasos_menor_a_uno(cliente, slug):
    cuerpo = {"funcion": "y + t", "y0": "1", "h": "0.1", "pasos": 0}
    if slug == "runge-kutta-orden-superior":
        cuerpo = {"funcion": "U", "y0": "1", "yp0": "1", "h": "0.1", "pasos": 0}
    assert cliente.post(f"/api/calcular/{slug}", json=cuerpo).status_code == 422


@pytest.mark.parametrize("slug", SLUGS_PRIMER_ORDEN)
def test_division_entre_cero(cliente, slug):
    """y' = 1/y con y_0 = 0: división entre cero al evaluar f."""
    r = cliente.post(f"/api/calcular/{slug}", json={"funcion": "1/y", "y0": "0", "h": "0.1"})
    assert r.status_code == 422


def test_division_entre_cero_orden_superior(cliente):
    r = cliente.post("/api/calcular/runge-kutta-orden-superior",
                     json={"funcion": "1/U", "y0": "0", "yp0": "1", "h": "0.1"})
    assert r.status_code == 422


def test_variable_no_reconocida(cliente):
    r = cliente.post("/api/calcular/euler-adelante", json={"funcion": "x + y", "y0": "1", "h": "0.1"})
    assert r.status_code == 422


def test_h_no_positiva_orden_superior(cliente):
    r = cliente.post("/api/calcular/runge-kutta-orden-superior",
                     json={"funcion": "U", "y0": "1", "yp0": "1", "h": "0"})
    assert r.status_code == 422


@pytest.mark.parametrize("slug", SLUGS_PRIMER_ORDEN + ["runge-kutta-orden-superior"])
def test_catalogo_ejemplo_valido(cliente, slug):
    metodos = {m["slug"]: m for m in cliente.get("/api/metodos").json()}
    assert slug in metodos
    ejemplo = metodos[slug]["ejemplo"]
    assert cliente.post(f"/api/calcular/{slug}", json=ejemplo).status_code == 200


def test_pasos_sustitucion_formato_libro(cliente):
    """La sustitución muestra la fórmula del libro y los valores (k_1 = h f(y_0, t_0) = ...)."""
    datos = _calcular(cliente, "runge-kutta-3",
                      {"funcion": "(2yt + 1)/y^2", "y0": "1", "h": "0.25"})
    latex = " ".join(p["latex"] for p in datos["pasos"])
    assert r"k_3 = h\,f(y_0 - k_1 + 2k_2, t_0 + h)" in latex
    assert "2(0.25308642)" in latex  # coeficiente por valor, sin pegar dígitos
