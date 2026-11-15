"""Unidad I · 1 Interpolación — ejemplos resueltos del libro."""
import mpmath

from tests.conftest import cerca


def test_interpolacion_lineal_ejemplo_a_libro(cliente):
    """p.5 a) Ln 4 entre Ln 2 y Ln 5: g(x) = 1.304007668, Є = 0.082286693."""
    r = cliente.post(
        "/api/calcular/interpolacion-lineal",
        json={"a": "2", "b": "5", "x": "4", "f_a": "0.69314718", "f_b": "1.609437912",
              "f_x": "1.386294361"},
    )
    assert r.status_code == 200, r.text
    datos = r.json()
    assert datos["nombre_libro"] == "Interpolación Lineal"
    assert datos["pagina"] == 4
    assert cerca(datos["resultado"]["g(x)"], "1.304007668")
    assert cerca(datos["resultado"]["Є"], "0.082286693")
    assert isinstance(datos["resultado"]["g(x)"], str)


def test_interpolacion_lineal_ejemplo_b_libro_con_funcion(cliente):
    """p.5 b) Ln 4 entre Ln 3 y Ln 5: g(x) = 1.354025101, Є = 0.03226926. f(a), f(b) desde Ln(x)."""
    r = cliente.post(
        "/api/calcular/interpolacion-lineal",
        json={"a": "3", "b": "5", "x": "4", "funcion": "Ln(x)"},
    )
    assert r.status_code == 200, r.text
    res = r.json()["resultado"]
    assert cerca(res["g(x)"], "1.354025101")
    assert cerca(res["Є"], "0.03226926")
    # Referencia mpmath a 50 cifras
    ref = (mpmath.log(5) - mpmath.log(3)) / 2 * 1 + mpmath.log(3)
    assert cerca(res["g(x)"], ref)


def test_interpolacion_lineal_a_igual_b(cliente):
    r = cliente.post("/api/calcular/interpolacion-lineal", json={"a": "2", "b": "2", "x": "4", "funcion": "x"})
    assert r.status_code == 422


def test_catalogo_incluye_ejemplo_valido(cliente):
    metodos = {m["slug"]: m for m in cliente.get("/api/metodos").json()}
    assert "interpolacion-lineal" in metodos
    ejemplo = metodos["interpolacion-lineal"]["ejemplo"]
    assert cliente.post("/api/calcular/interpolacion-lineal", json=ejemplo).status_code == 200


# ---------------------------------------------------------------------------
# Newton hacia Adelante, Newton hacia Atrás, Diferencias Divididas, Lagrange
# ---------------------------------------------------------------------------

DATOS_UNIFORMES = {"x": ["2.2", "2.5", "2.8"], "y": ["2.54", "2.82", "3.21"], "x_interpolar": "2.4"}
DATOS_NO_UNIFORMES = {"x": ["4.4", "3.7", "3.1"], "y": ["-0.68", "-1.59", "-1.82"], "x_interpolar": "3.5"}


def _lagrange_mpmath(xs, ys, t):
    """Referencia independiente a 50 cifras: polinomio de Lagrange con mpmath."""
    xs = [mpmath.mpf(v) for v in xs]
    ys = [mpmath.mpf(v) for v in ys]
    t = mpmath.mpf(t)
    total = mpmath.mpf(0)
    for i in range(len(xs)):
        termino = ys[i]
        for j in range(len(xs)):
            if j != i:
                termino *= (t - xs[j]) / (xs[i] - xs[j])
        total += termino
    return total


def _post(cliente, slug, datos):
    r = cliente.post(f"/api/calcular/{slug}", json=datos)
    assert r.status_code == 200, r.text
    return r.json()


def test_newton_adelante_ejemplo_libro(cliente):
    """p.8: h = 0.3, Δ´ = 0.28, 0.39, Δ² = 0.11, s = 0.666666666, g(x) = 2.714444444."""
    datos = _post(cliente, "newton-adelante", DATOS_UNIFORMES)
    assert datos["nombre_libro"] == "Newton hacia Adelante"
    assert datos["pagina"] == 6
    res = datos["resultado"]
    assert cerca(res["h"], "0.3")
    assert cerca(res["s"], "0.666666666")
    assert cerca(res["g(x)"], "2.714444444")
    assert cerca(res["g(x)"], _lagrange_mpmath(DATOS_UNIFORMES["x"], DATOS_UNIFORMES["y"], "2.4"))
    assert [c["latex"] for c in datos["columnas"]] == ["x_i", "y_i", r"\Delta' f(x_i)", r"\Delta^{2} f(x_i)"]
    filas = datos["filas"]
    assert cerca(filas[0]["d1"], "0.28") and cerca(filas[1]["d1"], "0.39")
    assert cerca(filas[0]["d2"], "0.11")
    assert filas[1]["d2"] is None and filas[2]["d1"] is None
    assert isinstance(res["g(x)"], str)
    assert {s["nombre"] for s in datos["series"]} == {"Datos (x_i, y_i)", "g(x)", "(x, g(x))"}


def test_newton_atras_ejemplo_libro(cliente):
    """p.10: s = -1.333333333, ∇´ = 0.28 (renglón 2), 0.39 (renglón 3), ∇² = 0.11, g(x) = 2.714444444."""
    datos = _post(cliente, "newton-atras", DATOS_UNIFORMES)
    assert datos["nombre_libro"] == "Newton hacia Atrás"
    res = datos["resultado"]
    assert cerca(res["s"], "-1.333333333")
    assert cerca(res["g(x)"], "2.714444444")
    assert cerca(res["g(x)"], _lagrange_mpmath(DATOS_UNIFORMES["x"], DATOS_UNIFORMES["y"], "2.4"))
    filas = datos["filas"]
    assert filas[0]["d1"] is None
    assert cerca(filas[1]["d1"], "0.28") and cerca(filas[2]["d1"], "0.39")
    assert cerca(filas[2]["d2"], "0.11")
    assert datos["columnas"][2]["latex"] == r"\nabla' f(x_i)"


def test_diferencias_divididas_ejemplo_libro(cliente):
    """p.12: D₁¹ = 1.3, D₂¹ = 0.383333333, D₁² = 0.705128205, g(x) = -1.723076923."""
    datos = _post(cliente, "diferencias-divididas", DATOS_NO_UNIFORMES)
    assert datos["nombre_libro"] == "Newton con Diferencias Divididas"
    filas = datos["filas"]
    assert cerca(filas[0]["d1"], "1.3")
    assert cerca(filas[1]["d1"], "0.383333333")
    assert cerca(filas[0]["d2"], "0.705128205")
    res = datos["resultado"]
    assert cerca(res["g(x)"], "-1.723076923")
    assert cerca(res["g(x)"], _lagrange_mpmath(DATOS_NO_UNIFORMES["x"], DATOS_NO_UNIFORMES["y"], "3.5"))
    assert any("no uniformes" in p["latex"] for p in datos["pasos"])


def test_lagrange_ejemplo_libro(cliente):
    """p.14: 0.564444444 + 2.506666667 + (-0.356666666) = 2.714444444."""
    datos = _post(cliente, "lagrange", DATOS_UNIFORMES)
    assert datos["nombre_libro"] == "Lagrange"
    assert cerca(datos["resultado"]["g(x)"], "2.714444444")
    terminos = [p["latex"].rsplit("=", 1)[1].strip() for p in datos["pasos"] if p["descripcion"].startswith("Término")]
    assert len(terminos) == 3
    for obtenido, libro in zip(terminos, ["0.564444444", "2.506666667", "-0.356666666"]):
        assert cerca(obtenido, libro)


def test_metodos_coinciden_con_mpmath_cuatro_puntos(cliente):
    """Polinomio de grado 3 con datos uniformes: los cuatro métodos dan el mismo g(x) que mpmath."""
    datos = {"x": ["1", "1.5", "2", "2.5"], "y": ["0.5", "-1.25", "3.1", "7"], "x_interpolar": "1.8"}
    ref = _lagrange_mpmath(datos["x"], datos["y"], "1.8")
    for slug in ("newton-adelante", "newton-atras", "diferencias-divididas", "lagrange"):
        res = _post(cliente, slug, datos)["resultado"]
        assert cerca(res["g(x)"], ref), slug


def test_newton_datos_descendentes_se_invierten(cliente):
    datos = {"x": ["2.8", "2.5", "2.2"], "y": ["3.21", "2.82", "2.54"], "x_interpolar": "2.4"}
    r = _post(cliente, "newton-adelante", datos)
    assert cerca(r["resultado"]["g(x)"], "2.714444444")
    assert r["advertencias"]


def test_newton_h_no_uniforme_es_error(cliente):
    for slug in ("newton-adelante", "newton-atras"):
        r = cliente.post(f"/api/calcular/{slug}", json=DATOS_NO_UNIFORMES)
        assert r.status_code == 422, slug
        assert "Diferencias Divididas" in r.text


def test_x_repetidos_es_error(cliente):
    datos = {"x": ["1", "2", "1"], "y": ["1", "2", "3"], "x_interpolar": "1.5"}
    for slug in ("newton-adelante", "newton-atras", "diferencias-divididas", "lagrange"):
        assert cliente.post(f"/api/calcular/{slug}", json=datos).status_code == 422, slug


def test_listas_de_distinto_largo_o_insuficientes(cliente):
    for slug in ("newton-adelante", "newton-atras", "diferencias-divididas", "lagrange"):
        assert cliente.post(f"/api/calcular/{slug}", json={"x": ["1", "2"], "y": ["1"], "x_interpolar": "1"}).status_code == 422
        assert cliente.post(f"/api/calcular/{slug}", json={"x": ["1"], "y": ["1"], "x_interpolar": "1"}).status_code == 422


def test_catalogo_ejemplos_de_tabla_validos(cliente):
    metodos = {m["slug"]: m for m in cliente.get("/api/metodos").json()}
    for slug in ("newton-adelante", "newton-atras", "diferencias-divididas", "lagrange"):
        assert slug in metodos
        assert cliente.post(f"/api/calcular/{slug}", json=metodos[slug]["ejemplo"]).status_code == 200
