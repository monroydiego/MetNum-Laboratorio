"""Unidad III · 5 Integración — ejemplos resueltos del libro (p.52–60) + referencia mpmath a 50 cifras.

mpmath.quad da el valor real de la integral; las reglas del libro son aproximaciones, así que contra
mpmath se compara la CERCANÍA (cota de error de la regla), no la igualdad. Contra la fórmula exacta de
cada regla evaluada con mpmath sí se exige igualdad a ±1e-9.
"""
from decimal import Decimal
from fractions import Fraction

import mpmath
import pytest

from app.use_cases.integracion import (
    ERRATAS_CERRADAS,
    TABLA_ABIERTAS,
    TABLA_CERRADAS,
    verificar_tablas,
)
from tests.conftest import cerca

URL = "/api/calcular/"


def f_libro(x):
    return 1 / (1 + x**2)


def _post(cliente, slug, **datos):
    r = cliente.post(URL + slug, json=datos)
    assert r.status_code == 200, r.text
    return r.json()


def _referencia_regla(f, a, b, pesos, factor, divisor):
    """La regla del libro evaluada directamente con mpmath a 50 cifras."""
    a, b = mpmath.mpf(a), mpmath.mpf(b)
    h = (b - a) / divisor
    return mpmath.mpf(factor.numerator) / factor.denominator * h * mpmath.fsum(
        w * f(a + i * h) for i, w in enumerate(pesos)
    )


# --------------------------------------------------------------- Regla Trapezoidal
def test_trapezoidal_ejemplo_libro(cliente):
    """p.54: ∫₂³ 1/(1+x²) dx, n = 4 → h = 1/4, I = 0.142416952."""
    datos = _post(cliente, "trapezoidal", funcion="1/(1+x^2)", a="2", b="3", n=4)
    assert datos["nombre_libro"] == "Regla Trapezoidal"
    assert datos["pagina"] == 53
    res = datos["resultado"]
    assert res["h"] == "1/4"
    assert isinstance(res["I"], str)
    assert cerca(res["I"], "0.142416952")
    # Σ de i = 1 a n − 1 (como el ejemplo): coeficientes 1, 2, 2, 2, 1
    assert [f["w"] for f in datos["filas"]] == ["1", "2", "2", "2", "1"]
    assert [f["x"] for f in datos["filas"]] == ["2", "9/4", "5/2", "11/4", "3"]
    assert cerca(res["I"], _referencia_regla(f_libro, 2, 3, [1, 2, 2, 2, 1], Fraction(1, 2), 4))
    # Formato del libro: h en recuadro, suma 1.139335619 con factor 1/8, I en recuadro
    latex = [p["latex"] for p in datos["pasos"]]
    assert any(r"\boxed{h = \frac{1}{4}}" in t for t in latex)
    assert any("(1/8)" in t and "1.139335619" in t for t in latex)
    assert latex[-1] == r"\boxed{I = 0.142416952}"
    # Cercanía al valor real (mpmath.quad): error de la regla con n = 4
    real = mpmath.quad(f_libro, [2, 3])
    assert abs(Decimal(res["I"]) - Decimal(mpmath.nstr(real, 30))) < Decimal("1e-3")


def test_trapezoidal_series(cliente):
    datos = _post(cliente, "trapezoidal", funcion="1/(1+x^2)", a="2", b="3", n=4)
    tipos = [s["tipo"] for s in datos["series"]]
    assert tipos == ["linea", "puntos"]
    assert len(datos["series"][1]["puntos"]) == 5


# --------------------------------------------------------------- Newton – Cotes
def test_newton_cotes_abiertas_ejemplo_libro(cliente):
    """p.56: ∫₋₂² (3x³ − 10) dx, n = 4 → h = 2/3, α = 6/20, I = −40."""
    datos = _post(cliente, "newton-cotes-abiertas", funcion="3x^3 - 10", a="-2", b="2", n=4)
    res = datos["resultado"]
    assert res["h"] == "2/3"
    assert res["α"] == "6/20"
    assert cerca(res["I"], "-40")
    assert [f["w"] for f in datos["filas"]] == ["0", "11", "-14", "26", "-14", "11", "0"]
    assert any("(1/5)" in p["latex"] and "-200" in p["latex"] for p in datos["pasos"])
    # Polinomio de grado 3: la fórmula es exacta → coincide con mpmath.quad
    assert cerca(res["I"], mpmath.quad(lambda x: 3 * x**3 - 10, [-2, 2]))


def test_newton_cotes_cerradas_con_ejemplo_de_abiertas(cliente):
    """Nota p.56: resolver el mismo ejemplo por Newton – Cotes Cerradas → −40."""
    for n in range(1, 11):
        datos = _post(cliente, "newton-cotes-cerradas", funcion="3x^3 - 10", a="-2", b="2", n=n)
        assert cerca(datos["resultado"]["I"], "-40"), (n, datos["resultado"])
    datos = _post(cliente, "newton-cotes-cerradas", funcion="3x^3 - 10", a="-2", b="2", n=4)
    assert datos["resultado"]["α"] == "2/45"
    assert datos["resultado"]["h"] == "1"


def test_newton_cotes_cerradas_vs_mpmath(cliente):
    """∫₂³ 1/(1+x²) dx con n = 6 contra la regla evaluada con mpmath y cercana a mpmath.quad."""
    datos = _post(cliente, "newton-cotes-cerradas", funcion="1/(1+x^2)", a="2", b="3", n=6)
    (p, q), w = TABLA_CERRADAS[6]
    assert cerca(datos["resultado"]["I"], _referencia_regla(f_libro, 2, 3, w, Fraction(p, q), 6))
    real = mpmath.quad(f_libro, [2, 3])
    assert abs(Decimal(datos["resultado"]["I"]) - Decimal(mpmath.nstr(real, 30))) < Decimal("1e-7")


def test_newton_cotes_cerradas_renglon_corregido_avisa(cliente):
    datos = _post(cliente, "newton-cotes-cerradas", funcion="1/(1+x^2)", a="2", b="3", n=8)
    assert any("corregido" in a for a in datos["advertencias"])
    real = mpmath.quad(f_libro, [2, 3])
    assert abs(Decimal(datos["resultado"]["I"]) - Decimal(mpmath.nstr(real, 30))) < Decimal("1e-9")


def test_newton_cotes_abiertas_extremo_no_definido(cliente):
    """Las abiertas no usan f(a) ni f(b) (peso 0): ∫₀¹ 1/√x dx no falla en x = 0."""
    datos = _post(cliente, "newton-cotes-abiertas", funcion="1/sqrt(x)", a="0", b="1", n=2)
    assert datos["filas"][0]["fx"] is None
    assert datos["advertencias"]


@pytest.mark.parametrize(
    ("slug", "n"),
    [("newton-cotes-cerradas", 11), ("newton-cotes-cerradas", 0), ("newton-cotes-abiertas", 7)],
)
def test_newton_cotes_n_fuera_de_tabla(cliente, slug, n):
    r = cliente.post(URL + slug, json={"funcion": "x", "a": "0", "b": "1", "n": n})
    assert r.status_code == 422


# --------------------------------------------------------------- Tablas p.57
def test_tablas_alfa_por_suma_de_pesos():
    """Verificación interna: α·Σw = n (cerradas) y n + 2 (abiertas).

    Diferencias con lo impreso en el libro (corregidas por decisión del usuario):
    - cerradas n = 8: impreso α = 14/14175 y w_3 = w_5 = 10946 → correcto 4/14175 y 10496.
    - cerradas n = 9: impreso w_4 = w_5 = 5788 → correcto 5778.
    """
    assert verificar_tablas() == []
    for n, ((p, q), w) in TABLA_CERRADAS.items():
        assert Fraction(p, q) * sum(w) == n
    for n, ((p, q), w) in TABLA_ABIERTAS.items():
        assert Fraction(p, q) * sum(w) == n + 2
    # Con los valores impresos la verificación falla (justifica la corrección)
    impreso_8 = [989, 5888, -928, 10946, -4540, 10946, -928, 5888, 989]
    assert Fraction(14, 14175) * sum(impreso_8) != 8
    impreso_9 = [2857, 15741, 1080, 19344, 5788, 5788, 19344, 1080, 15741, 2857]
    assert Fraction(9, 89600) * sum(impreso_9) != 9
    assert set(ERRATAS_CERRADAS) == {8, 9}


def test_tablas_endpoint(cliente):
    datos = _post(cliente, "tablas-newton-cotes", tipo="ambas")
    assert datos["pagina"] == 57
    cerradas, abiertas = datos["matrices"]
    assert cerradas["filas"][0][:3] == ["n", "α", "i = 0"]
    assert len(cerradas["filas"]) == 11 and len(abiertas["filas"]) == 7
    assert cerradas["filas"][4][:7] == ["4", "2/45", "7", "32", "12", "32", "7"]
    assert abiertas["filas"][4][:9] == ["4", "6/20", "0", "11", "-14", "26", "-14", "11", "0"]
    assert cerradas["filas"][8][1] == "4/14175"
    assert len(datos["advertencias"]) == 2
    solo = _post(cliente, "tablas-newton-cotes", tipo="abiertas")
    assert len(solo["matrices"]) == 1 and not solo["advertencias"]


# --------------------------------------------------------------- Simpson
def test_simpson_1_3_ejemplo_libro(cliente):
    """p.58: ∫₂³ 1/(1+x²) dx, n = 10 → h = 1/10, I = 0.14189715 (libro trunca a 8 decimales)."""
    datos = _post(cliente, "simpson-1-3", funcion="1/(1+x^2)", a="2", b="3", n=10)
    res = datos["resultado"]
    assert res["h"] == "1/10"
    assert cerca(res["I"], "0.14189715")
    assert cerca(res["I"], "0.1418971505")
    assert [f["w"] for f in datos["filas"]] == ["1", "4", "2", "4", "2", "4", "2", "4", "2", "4", "1"]
    assert any("(1/30)" in p["latex"] and "4.256914514" in p["latex"] for p in datos["pasos"])
    real = mpmath.quad(f_libro, [2, 3])  # atan(3) − atan(2)
    assert abs(Decimal(res["I"]) - Decimal(mpmath.nstr(real, 30))) < Decimal("1e-7")


def test_simpson_1_3_n_impar(cliente):
    r = cliente.post(URL + "simpson-1-3", json={"funcion": "x", "a": "0", "b": "1", "n": 5})
    assert r.status_code == 422
    assert "par" in r.json()["detail"]


def test_simpson_3_8_ejemplo_libro(cliente):
    """p.59: ∫₀¹ x³eˣ dx, n = 3 → h = 1/3, I = 0.575583627 (el libro trunca; exacto 0.5755836279)."""
    datos = _post(cliente, "simpson-3-8", funcion="x^3 e^x", a="0", b="1", n=3)
    res = datos["resultado"]
    assert res["h"] == "1/3"
    assert cerca(res["I"], "0.575583627")
    f = lambda x: x**3 * mpmath.e**x  # noqa: E731
    assert cerca(res["I"], _referencia_regla(f, 0, 1, [1, 3, 3, 1], Fraction(3, 8), 3))
    assert any("4.604669023" in p["latex"] for p in datos["pasos"])
    real = mpmath.quad(f, [0, 1])  # 0.563436343; con solo 4 puntos el error de la regla es ≈ 0.012
    assert abs(Decimal(res["I"]) - Decimal(mpmath.nstr(real, 30))) < Decimal("2e-2")


@pytest.mark.parametrize("n", [1, 2, 6, 9])
def test_simpson_3_8_solo_n_3(cliente, n):
    r = cliente.post(URL + "simpson-3-8", json={"funcion": "x", "a": "0", "b": "1", "n": n})
    assert r.status_code == 422


# --------------------------------------------------------------- Casos borde comunes
@pytest.mark.parametrize("slug", ["trapezoidal", "simpson-1-3", "newton-cotes-cerradas"])
def test_a_mayor_o_igual_que_b(cliente, slug):
    for a, b in (("3", "2"), ("2", "2")):
        r = cliente.post(URL + slug, json={"funcion": "x", "a": a, "b": b, "n": 2})
        assert r.status_code == 422


def test_funcion_no_definida_en_nodo(cliente):
    r = cliente.post(URL + "trapezoidal", json={"funcion": "1/x", "a": "0", "b": "1", "n": 2})
    assert r.status_code == 422


def test_limites_no_racionales_y_decimales(cliente):
    """a, b con decimales: se muestran como decimales; el resultado no depende de la representación."""
    d1 = _post(cliente, "trapezoidal", funcion="1/(1+x^2)", a="2.0", b="3.0", n=4)
    d2 = _post(cliente, "trapezoidal", funcion="1/(1+x^2)", a="2", b="3", n=4)
    assert d1["resultado"]["I"] == d2["resultado"]["I"]
    d3 = _post(cliente, "trapezoidal", funcion="1/(1+x^2)", a="2", b="3", n=4, decimales=4)
    assert d3["resultado"]["I"] == "0.1424"


def test_catalogo_ejemplos_integracion_validos(cliente):
    metodos = {m["slug"]: m for m in cliente.get("/api/metodos").json()}
    for slug in ("trapezoidal", "newton-cotes-cerradas", "newton-cotes-abiertas", "tablas-newton-cotes",
                 "simpson-1-3", "simpson-3-8"):
        assert slug in metodos
        assert metodos[slug]["unidad"] == 3
        assert cliente.post(URL + slug, json=metodos[slug]["ejemplo"]).status_code == 200
