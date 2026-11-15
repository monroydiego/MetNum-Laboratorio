"""Unidad II · 3 Solución de Ecuaciones Lineales — ejemplos resueltos del libro (p.28–44).

Directos (Montante, Gauss – Jordán, Eliminación Gaussiana): fracciones exactas, comparación
exacta contra el libro y contra mpmath.lu_solve a 50 cifras.
Iterativos (Gauss – Seidel, Jacobi): ±1e-9 contra el libro (el libro redondea/trunca a 9
decimales) incluyendo filas intermedias.
"""
from fractions import Fraction

import mpmath
import pytest

from tests.conftest import cerca

MONTANTE = [["2", "5", "-2", "1"], ["-1", "2", "3", "2"], ["3", "-3", "2", "3"]]
GAUSS_JORDAN = [["3", "-2", "2", "1"], ["4", "2", "2", "2"], ["3", "-3", "3", "3"]]
ELIMINACION = [["2", "1", "-3", "-1"], ["-1", "3", "2", "12"], ["3", "1", "-3", "0"]]
ITERATIVO = [["1", "-3", "5", "5"], ["8", "-1", "-1", "8"], ["-2", "4", "1", "4"]]


def calcular(cliente, slug: str, cuerpo: dict):
    return cliente.post(f"/api/calcular/{slug}", json=cuerpo)


def referencia(matriz: list[list[str]]) -> list[mpmath.mpf]:
    """Solución de referencia con mpmath.lu_solve a 50 cifras."""
    n = len(matriz)
    A = mpmath.matrix([[mpmath.mpf(Fraction(x).numerator) / Fraction(x).denominator
                        for x in fila[:n]] for fila in matriz])
    b = mpmath.matrix([mpmath.mpf(Fraction(f[n]).numerator) / Fraction(f[n]).denominator
                       for f in matriz])
    x = mpmath.lu_solve(A, b)
    return [x[i] for i in range(n)]


def a_mpf(texto: str) -> mpmath.mpf:
    q = Fraction(texto)
    return mpmath.mpf(q.numerator) / q.denominator


def exacto_vs_mpmath(texto: str, ref: mpmath.mpf) -> bool:
    return abs(a_mpf(texto) - ref) < mpmath.mpf(10) ** -45


# ------------------------------------------------------------------------------- Montante
def test_montante_ejemplo_libro(cliente):
    """p.30–31: matriz final con diagonal 87; a = 62/87, b = 19/87, c = 66/87."""
    r = calcular(cliente, "montante", {"matriz": MONTANTE})
    assert r.status_code == 200, r.text
    datos = r.json()
    assert datos["nombre_libro"] == "Montante"
    assert datos["pagina"] == 29
    res = datos["resultado"]
    assert (res["a"], res["b"], res["c"]) == ("62/87", "19/87", "66/87")
    assert res["Determinante"] == "87"
    assert cerca(res["a (decimal)"], mpmath.mpf(62) / 87)

    matrices = datos["matrices"]
    assert [m["nota"] for m in matrices[:3]] == ["Pivote = 1", "Pivote = 2", "Pivote = 9"]
    assert [m["pivote"] for m in matrices[:3]] == [[0, 0], [1, 1], [2, 2]]
    assert matrices[1]["filas"] == [["2", "5", "-2", "1"], ["0", "9", "4", "5"],
                                    ["0", "-21", "10", "3"]]
    assert matrices[2]["filas"][2] == ["0", "0", "87", "66"]
    assert matrices[-1]["filas"] == [["87", "0", "0", "62"], ["0", "87", "0", "19"],
                                     ["0", "0", "87", "66"]]
    # Fórmula N.E con los valores del libro: (2)(2)-(5)(-1) / 1
    assert any(r"\frac{(2)(2) - (5)(-1)}{1} = 9" in p["latex"] for p in datos["pasos"])
    assert datos["pasos"][-1]["descripcion"] == "Comprobación"

    for texto, ref in zip((res["a"], res["b"], res["c"]), referencia(MONTANTE)):
        assert exacto_vs_mpmath(texto, ref)


def test_montante_4x4_contra_mpmath(cliente):
    matriz = [["4", "-1", "2", "3", "20"], ["-2", "7", "1", "-1", "-7"],
              ["3", "1", "-5", "2", "4"], ["1", "2", "3", "9", "1/2"]]
    r = calcular(cliente, "montante", {"matriz": matriz, "variables": ["a", "b", "c", "d"]})
    assert r.status_code == 200, r.text
    res = r.json()["resultado"]
    for v, ref in zip("abcd", referencia(matriz)):
        assert exacto_vs_mpmath(res[v], ref)


def test_montante_pivote_cero_intercambia_renglon(cliente):
    matriz = [["0", "2", "1", "4"], ["1", "1", "1", "3"], ["2", "-1", "3", "5"]]
    r = calcular(cliente, "montante", {"matriz": matriz})
    assert r.status_code == 200, r.text
    datos = r.json()
    assert datos["advertencias"]
    for v, ref in zip("abc", referencia(matriz)):
        assert exacto_vs_mpmath(datos["resultado"][v], ref)
    # Con un intercambio el determinante cambia de signo respecto a la diagonal final
    A = mpmath.matrix([[0, 2, 1], [1, 1, 1], [2, -1, 3]])
    assert Fraction(datos["resultado"]["Determinante"]) == int(mpmath.nint(mpmath.det(A)))


def test_montante_sistema_singular(cliente):
    matriz = [["1", "2", "3", "1"], ["2", "4", "6", "2"], ["1", "1", "1", "1"]]
    r = calcular(cliente, "montante", {"matriz": matriz})
    assert r.status_code == 422
    assert "singular" in r.json()["detail"]


# ------------------------------------------------------------------------------ Gauss – Jordán
def test_gauss_jordan_ejemplo_libro(cliente):
    """p.33: a = -1, b = 1/2, c = 5/2 y matrices intermedias Pivote = 14/3, Pivote = 6/7."""
    r = calcular(cliente, "gauss-jordan", {"matriz": GAUSS_JORDAN})
    assert r.status_code == 200, r.text
    datos = r.json()
    assert datos["nombre_libro"] == "Gauss – Jordán"
    res = datos["resultado"]
    assert (res["a"], res["b"], res["c"]) == ("-1", "1/2", "5/2")
    m = datos["matrices"]
    assert [x["nota"] for x in m[:3]] == ["Pivote = 3", "Pivote = 14/3", "Pivote = 6/7"]
    assert m[1]["filas"] == [["1", "-2/3", "2/3", "1/3"], ["0", "14/3", "-2/3", "2/3"],
                             ["0", "-1", "1", "2"]]
    assert m[2]["filas"] == [["1", "0", "4/7", "3/7"], ["0", "1", "-1/7", "1/7"],
                             ["0", "0", "6/7", "15/7"]]
    assert m[3]["filas"] == [["1", "0", "0", "-1"], ["0", "1", "0", "1/2"],
                             ["0", "0", "1", "5/2"]]
    latex = " ".join(p["latex"] for p in datos["pasos"])
    assert "2 - 4(-2/3) = 14/3" in latex  # En = Ea - Eccp * Ecfp
    assert "(15/7) / (6/7) = 5/2" in latex
    for texto, ref in zip((res["a"], res["b"], res["c"]), referencia(GAUSS_JORDAN)):
        assert exacto_vs_mpmath(texto, ref)


def test_gauss_jordan_pivote_cero_y_singular(cliente):
    matriz = [["0", "1", "2"], ["3", "1", "5"]]
    r = calcular(cliente, "gauss-jordan", {"matriz": matriz, "variables": ["a", "b"]})
    assert r.status_code == 200, r.text
    res = r.json()["resultado"]
    for v, ref in zip("ab", referencia(matriz)):
        assert exacto_vs_mpmath(res[v], ref)
    r = calcular(cliente, "gauss-jordan", {"matriz": [["1", "2", "3"], ["2", "4", "5"]]})
    assert r.status_code == 422


# ------------------------------------------------------------------------ Eliminación Gaussiana
def test_eliminacion_gaussiana_ejemplo_libro(cliente):
    """p.34–35: renglones intermedios y x₁ = 1, x₂ = 3, x₃ = 2."""
    r = calcular(cliente, "eliminacion-gaussiana", {"matriz": ELIMINACION})
    assert r.status_code == 200, r.text
    datos = r.json()
    res = datos["resultado"]
    assert (res["x₁"], res["x₂"], res["x₃"]) == ("1", "3", "2")
    m = datos["matrices"]
    assert m[1]["filas"][1] == ["0", "7/2", "1/2", "23/2"]
    assert m[2]["filas"][2] == ["0", "-1/2", "3/2", "3/2"]
    assert m[-1]["filas"] == [["2", "1", "-3", "-1"], ["0", "7/2", "1/2", "23/2"],
                              ["0", "0", "11/7", "22/7"]]
    descripciones = [p["descripcion"] for p in datos["pasos"]]
    assert "2do renglón – 1er renglón" in descripciones
    assert "1er renglón * -1/2" in descripciones
    assert any(d.startswith("Entonces") for d in descripciones)
    for texto, ref in zip((res["x₁"], res["x₂"], res["x₃"]), referencia(ELIMINACION)):
        assert exacto_vs_mpmath(texto, ref)


def test_eliminacion_gaussiana_fracciones_contra_mpmath(cliente):
    matriz = [["1/2", "1/3", "-1", "0.25"], ["2", "-5", "1/7", "3"], ["-1", "4", "6", "-2/3"]]
    r = calcular(cliente, "eliminacion-gaussiana", {"matriz": matriz})
    assert r.status_code == 200, r.text
    res = r.json()["resultado"]
    for v, ref in zip(("x₁", "x₂", "x₃"), referencia(matriz)):
        assert exacto_vs_mpmath(res[v], ref)
        assert cerca(res[f"{v} (decimal)"], ref)


def test_eliminacion_gaussiana_singular(cliente):
    matriz = [["1", "1", "1", "1"], ["1", "2", "3", "2"], ["2", "3", "4", "3"]]
    assert calcular(cliente, "eliminacion-gaussiana", {"matriz": matriz}).status_code == 422


# ------------------------------------------------------------------------------- Gauss – Seidel
GS_LIBRO = [
    ("0", "0", "0"), ("1", "1.5", "1.7"), ("1.4", "1.275", "1.485"),
    ("1.345", "1.30125", "1.51175"), ("1.351625", "1.297875", "1.5084"),
    ("1.350784375", "1.298292188", "1.508818438"),
]


def test_gauss_seidel_ejemplo_libro(cliente):
    """p.37–38: se reordena a diagonal dominante; I = 5, Є de la tabla del libro."""
    r = calcular(cliente, "gauss-seidel", {"matriz": ITERATIVO, "tolerancia": "0.001"})
    assert r.status_code == 200, r.text
    datos = r.json()
    assert datos["nombre_libro"] == "Gauss – Seidel"
    assert [c["clave"] for c in datos["columnas"]] == ["I", "x", "y", "z"]
    assert len(datos["filas"]) == len(GS_LIBRO)
    for fila, esperado in zip(datos["filas"], GS_LIBRO):
        for v, e in zip("xyz", esperado):
            assert cerca(fila[v], e), (fila, esperado)
    res = datos["resultado"]
    assert res["I"] == "5"
    assert cerca(res["εx"], "0.000840625")
    assert cerca(res["εy"], "0.000417188")
    assert cerca(res["εz"], "0.000418438")
    assert any("reordenaron" in a for a in datos["advertencias"])
    assert any(p["descripcion"] == "Diagonal Dominante" for p in datos["pasos"])
    assert len(datos["errores"]) == 5 and all(isinstance(e, float) for e in datos["errores"])
    for v, ref in zip("xyz", referencia(ITERATIVO)):
        assert abs(a_mpf(res[v]) - ref) < mpmath.mpf("0.001")


def test_gauss_seidel_no_diagonal_dominante(cliente):
    """Sin orden con diagonal dominante: advertencia y tope de iteraciones."""
    r = calcular(cliente, "gauss-seidel", {"matriz": [["1", "1", "2"], ["2", "1", "3"]]})
    assert r.status_code == 200, r.text
    adv = " ".join(r.json()["advertencias"])
    assert "no es diagonal dominante" in adv
    assert "máximo" in adv or "diverge" in adv


def test_gauss_seidel_tolerancia_invalida(cliente):
    r = calcular(cliente, "gauss-seidel", {"matriz": ITERATIVO, "tolerancia": "0"})
    assert r.status_code == 422


# ------------------------------------------------------------------------------------- Jacobi
JACOBI_LIBRO = [
    ("1", "1", "1"), ("1.25", "1.25", "1.4"), ("1.33125", "1.275", "1.5"),
    ("1.346875", "1.290625", "1.49875"), ("1.348671875", "1.29875", "1.505"),
    ("1.35046875", "1.298085938", "1.509515625"),
    ("1.350950195", "1.297855469", "1.508757813"),
]


def test_jacobi_ejemplo_libro(cliente):
    """p.40–41: inicia con uno; I = 6. El libro trunca los Є (tolerancia ±1e-9)."""
    r = calcular(cliente, "jacobi", {"matriz": ITERATIVO})
    assert r.status_code == 200, r.text
    datos = r.json()
    assert datos["nombre_libro"] == "Jacobi"
    assert len(datos["filas"]) == len(JACOBI_LIBRO)
    for fila, esperado in zip(datos["filas"], JACOBI_LIBRO):
        for v, e in zip("xyz", esperado):
            assert cerca(fila[v], e), (fila, esperado)
    res = datos["resultado"]
    assert res["I"] == "6"
    assert cerca(res["εx"], "0.000481445")
    assert cerca(res["εy"], "0.000230468")
    assert cerca(res["εz"], "0.000757812")
    for v, ref in zip("xyz", referencia(ITERATIVO)):
        assert abs(a_mpf(res[v]) - ref) < mpmath.mpf("0.001")


def test_jacobi_converge_a_mpmath_con_tolerancia_pequena(cliente):
    r = calcular(cliente, "jacobi", {"matriz": ITERATIVO, "tolerancia": "1e-12"})
    assert r.status_code == 200, r.text
    res = r.json()["resultado"]
    for v, ref in zip("xyz", referencia(ITERATIVO)):
        assert cerca(res[v], ref)


# ------------------------------------------------------------------------ Raíces de Polinomios
def test_raices_polinomios_ejemplo_libro(cliente):
    """p.42: f(x) = x² + x − 6 -> x = −3, x = 2."""
    r = calcular(cliente, "raices-polinomios", {"coeficientes": ["1", "1", "-6"]})
    assert r.status_code == 200, r.text
    datos = r.json()
    assert datos["nombre_libro"] == "Raíces de Polinomios"
    assert (datos["resultado"]["x₁"], datos["resultado"]["x₂"]) == ("-3", "2")


def test_raices_polinomios_grado_3_divisores_y_division_sintetica(cliente):
    """x³ − 2x² − 5x + 6 = (x − 1)(x + 2)(x − 3)."""
    coefs = ["1", "-2", "-5", "6"]
    r = calcular(cliente, "raices-polinomios", {"coeficientes": coefs})
    assert r.status_code == 200, r.text
    datos = r.json()
    raices = [datos["resultado"][k] for k in ("x₁", "x₂", "x₃")]
    assert raices == ["-2", "1", "3"]
    assert any(m["titulo"].startswith("División Sintética") for m in datos["matrices"])
    assert any(f["x"] == "1" and f["f(x)"] == "0" for f in datos["filas"])
    ref = sorted(mpmath.re(z) for z in mpmath.polyroots([int(c) for c in coefs], extraprec=100))
    for texto, z in zip(raices, ref):
        assert abs(a_mpf(texto) - z) < mpmath.mpf(10) ** -40


def test_raices_polinomios_formula_general_irracional(cliente):
    """Ejercicio p.43: f(x) = 2x² − 6x − 3 (raíces irracionales por la Fórmula general)."""
    r = calcular(cliente, "raices-polinomios", {"coeficientes": ["2", "-6", "-3"]})
    assert r.status_code == 200, r.text
    res = r.json()["resultado"]
    ref = sorted(mpmath.polyroots([2, -6, -3]))
    assert cerca(res["x₁"], ref[0]) and cerca(res["x₂"], ref[1])


def test_raices_polinomios_complejas_y_sin_divisor_raiz(cliente):
    r = calcular(cliente, "raices-polinomios", {"coeficientes": ["1", "0", "1"]})
    assert r.status_code == 200
    assert any("complejas" in a for a in r.json()["advertencias"])
    r = calcular(cliente, "raices-polinomios", {"coeficientes": ["1", "0", "0", "-2"]})
    assert r.status_code == 200
    assert any("Ningún divisor" in a for a in r.json()["advertencias"])


def test_raices_polinomios_grado_cero(cliente):
    r = calcular(cliente, "raices-polinomios", {"coeficientes": ["0", "5"]})
    assert r.status_code == 422


# ------------------------------------------------------------------------- Validación general
@pytest.mark.parametrize("slug", ["montante", "gauss-jordan", "eliminacion-gaussiana",
                                  "gauss-seidel", "jacobi"])
def test_matriz_mal_formada(cliente, slug):
    assert calcular(cliente, slug, {"matriz": [["1", "2"], ["3", "4"]]}).status_code == 422
    assert calcular(cliente, slug, {"matriz": [["1", "x", "2"], ["3", "4", "5"]]}).status_code == 422
    r = calcular(cliente, slug, {"matriz": MONTANTE, "variables": ["a", "b"]})
    assert r.status_code == 422


def test_catalogo_ejemplos_validos(cliente):
    metodos = {m["slug"]: m for m in cliente.get("/api/metodos").json()}
    for slug in ("montante", "gauss-jordan", "eliminacion-gaussiana", "gauss-seidel", "jacobi",
                 "raices-polinomios"):
        assert slug in metodos
        assert metodos[slug]["unidad"] == 2
        assert calcular(cliente, slug, metodos[slug]["ejemplo"]).status_code == 200
