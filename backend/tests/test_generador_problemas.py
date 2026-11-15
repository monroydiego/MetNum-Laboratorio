"""Los problemas aleatorios cumplen EXACTAMENTE las restricciones de cada método del libro.

Las comprobaciones de este archivo son independientes del generador (se reescriben aquí con Fraction
y mpmath) y se aplican a decenas de semillas por método. Referencias: Libro, context/MC y context/OR.
"""
import itertools
import random
from fractions import Fraction

import mpmath
import pytest
from mpmath import mpf

import app.presentation.metodos  # noqa: F401 — registra los métodos
from app.infrastructure.math_parser import crear_funcion
from app.presentation.problemas import problema_verificado
from app.presentation.registro import REGISTRO
from app.use_cases.generador_problemas import GENERADORES, es_diagonal_dominante

SEMILLAS = range(40)
mpmath.mp.dps = 50


def problemas(slug: str, semillas=SEMILLAS):
    metodo = REGISTRO[slug]
    return [problema_verificado(metodo, random.Random(s)) for s in semillas]


def q(texto: str) -> Fraction:
    return Fraction(texto)


def f_de(texto: str, *variables: str):
    return crear_funcion(texto, variables or ("x",))


# --------------------------------------------------------------------------------------------
# Generales
# --------------------------------------------------------------------------------------------
def test_todos_los_metodos_tienen_generador():
    assert set(GENERADORES) == set(REGISTRO)


@pytest.mark.parametrize("slug", sorted(REGISTRO))
def test_problema_valido_resoluble_y_distinto_del_libro(slug):
    metodo = REGISTRO[slug]
    lote = problemas(slug, range(25))
    for datos in lote:
        resultado = metodo.ejecutar(metodo.entrada.model_validate(datos))  # no lanza
        assert resultado.resultado or resultado.filas or resultado.matrices
        if slug != "tablas-newton-cotes":
            assert datos != metodo.ejemplo, "no debe copiar el ejemplo del libro"
    distintos = {repr(d) for d in lote}
    assert len(distintos) >= (2 if slug == "tablas-newton-cotes" else 15), "los problemas deben variar"


def test_misma_semilla_mismo_problema():
    m = REGISTRO["lagrange"]
    assert problema_verificado(m, random.Random(7)) == problema_verificado(m, random.Random(7))


def test_valores_numericos_son_texto():
    for slug in REGISTRO:
        for d in problemas(slug, range(3)):
            for clave, valor in d.items():
                assert not isinstance(valor, float), f"{slug}.{clave} es float"


# --------------------------------------------------------------------------------------------
# Unidad I · 1 Interpolación
# --------------------------------------------------------------------------------------------
def test_interpolacion_lineal():
    for d in problemas("interpolacion-lineal"):
        a, b, x = q(d["a"]), q(d["b"]), q(d["x"])
        assert 1 <= a < x < b  # x dentro del intervalo; Ln definida
        assert d["funcion"] == "Ln(x)"
        for clave, p in (("f_a", a), ("f_b", b), ("f_x", x)):
            assert abs(mpf(d[clave]) - mpmath.log(mpf(p.numerator) / p.denominator)) < mpf("1e-8")


def _xs_ys(d):
    return [q(v) for v in d["x"]], [q(v) for v in d["y"]]


def _entre(xs, x):
    return any(min(xs[i], xs[i + 1]) < x < max(xs[i], xs[i + 1]) for i in range(len(xs) - 1))


@pytest.mark.parametrize("slug", ["newton-adelante", "newton-atras"])
def test_newton_intervalos_uniformes_y_x_dentro(slug):
    for d in problemas(slug):
        xs, ys = _xs_ys(d)
        x = q(d["x_interpolar"])
        assert len(xs) == len(ys) and 3 <= len(xs) <= 5
        hs = {xs[i + 1] - xs[i] for i in range(len(xs) - 1)}
        assert len(hs) == 1 and hs.pop() > 0  # h = x_{i+1} − x_i constante (uniforme)
        assert xs[0] < x < xs[-1] and x not in xs
        if slug == "newton-adelante":
            assert (x - xs[0]) / (xs[1] - xs[0]) > 0  # "s siempre positivo (izquierda a derecha)"
        else:
            assert (x - xs[-1]) / (xs[1] - xs[0]) < 0  # "s siempre negativo"


def test_diferencias_divididas_no_uniformes():
    descendentes = 0
    for d in problemas("diferencias-divididas"):
        xs, ys = _xs_ys(d)
        x = q(d["x_interpolar"])
        assert len(xs) == len(ys) and 3 <= len(xs) <= 5  # se requieren i+1 puntos
        hs = [abs(xs[i + 1] - xs[i]) for i in range(len(xs) - 1)]
        assert len(set(hs)) == len(hs), "los intervalos deben ser no uniformes"
        assert len(set(xs)) == len(xs) and _entre(xs, x) and x not in xs
        crec = all(xs[i] < xs[i + 1] for i in range(len(xs) - 1))
        dec = all(xs[i] > xs[i + 1] for i in range(len(xs) - 1))
        assert crec or dec
        descendentes += dec
    assert descendentes > 0  # el libro también presenta tablas de derecha a izquierda


def test_lagrange_uniforme_y_no_uniforme():
    tipos = set()
    for d in problemas("lagrange"):
        xs, ys = _xs_ys(d)
        x = q(d["x_interpolar"])
        assert len(xs) == len(ys) and 3 <= len(xs) <= 5 and len(set(xs)) == len(xs)
        assert xs == sorted(xs) and xs[0] < x < xs[-1] and x not in xs
        tipos.add(len({xs[i + 1] - xs[i] for i in range(len(xs) - 1)}) == 1)
    assert tipos == {True, False}  # "se aplica para intervalos uniformes y no uniformes"


@pytest.mark.parametrize("slug", ["newton-adelante", "newton-atras", "diferencias-divididas", "lagrange"])
def test_g_de_x_entre_los_valores_de_y_vecinos(slug):
    # Nota del libro (p.7): "g(x) se encuentra entre los valores de y" del intervalo que contiene a x
    for d in problemas(slug, range(20)):
        xs, ys = _xs_ys(d)
        x = q(d["x_interpolar"])
        g = Fraction(0)
        for i in range(len(xs)):
            t = ys[i]
            for j in range(len(xs)):
                if j != i:
                    t *= (x - xs[j]) / (xs[i] - xs[j])
            g += t
        k = next(i for i in range(len(xs) - 1) if min(xs[i], xs[i + 1]) < x < max(xs[i], xs[i + 1]))
        assert min(ys[k], ys[k + 1]) <= g <= max(ys[k], ys[k + 1])


# --------------------------------------------------------------------------------------------
# Unidad I · 2 Ecuaciones no lineales
# --------------------------------------------------------------------------------------------
def test_grafico_tabla_con_cambio_de_signo():
    for d in problemas("grafico"):
        f = f_de(d["funcion"])
        a, b, paso = int(d["a"]), int(d["b"]), int(d["paso"])
        assert a < b and paso == 1
        ys = [f(mpf(x)) for x in range(a, b + 1, paso)]
        assert any(ys[i] * ys[i + 1] < 0 for i in range(len(ys) - 1))  # "el cambio de signo indica una raíz"


def test_bisectriz_a_positiva_b_negativa():
    for d in problemas("bisectriz"):
        f = f_de(d["funcion"])
        a, b = mpf(d["a"]), mpf(d["b"])
        assert a < b and f(a) > 0 > f(b)
        assert d["tolerancia"] == "0.001"


def test_falsa_posicion_cambio_de_signo():
    for d in problemas("falsa-posicion"):
        f = f_de(d["funcion"])
        a, b = mpf(d["a"]), mpf(d["b"])
        assert a < b and f(a) * f(b) < 0


def test_secante_dos_valores_iniciales_distintos():
    for d in problemas("secante"):
        f = f_de(d["funcion"])
        x0, x1 = mpf(d["x0"]), mpf(d["x1"])
        assert x0 != x1 and f(x0) != f(x1)  # f(x_i) − f(x_{i−1}) ≠ 0


def test_newton_raphson_derivada_no_nula_en_x0():
    for d in problemas("newton-raphson"):
        f = f_de(d["funcion"])
        x0 = mpf(d["x0"])
        derivada = f_de(d["derivada"]) if d["derivada"] else f.derivada()
        assert abs(derivada(x0)) > 0.05
        if d["derivada"]:  # la derivada escrita coincide con la analítica
            assert abs(derivada(x0 + mpf("0.37")) - f.derivada()(x0 + mpf("0.37"))) < mpf("1e-12")


def test_punto_fijo_cumple_condicion_de_convergencia():
    for d in problemas("punto-fijo"):
        g = f_de(d["funcion"])
        f = f_de(d["f"])
        x = mpf(d["x0"])
        for _ in range(200):
            x = g(x)
        assert abs(x - g(x)) < mpf("1e-12")            # punto fijo alcanzado
        assert abs(f(x)) < mpf("1e-10")                 # y es raíz de f(x) = 0 (x = g(x) equivalente)
        assert abs(mpmath.diff(lambda t: g(t), x)) < 1  # |g'(x)| < 1
        assert d["tolerancia"] == "0.00001"


# --------------------------------------------------------------------------------------------
# Unidad II · 3 Ecuaciones lineales
# --------------------------------------------------------------------------------------------
def _matriz(d):
    return [[q(v) for v in fila] for fila in d["matriz"]]


def _det(m):
    if len(m) == 1:
        return m[0][0]
    return sum((-1) ** j * m[0][j] * _det([f[:j] + f[j + 1:] for f in m[1:]]) for j in range(len(m)))


@pytest.mark.parametrize("slug", ["montante", "gauss-jordan", "eliminacion-gaussiana"])
def test_sistemas_directos_solucion_unica(slug):
    for d in problemas(slug):
        m = _matriz(d)
        n = len(m)
        assert n == 3 and all(len(f) == n + 1 for f in m)
        assert _det([f[:n] for f in m]) != 0
        for k in range(1, n + 1):  # pivotes no nulos sin intercambiar renglones
            assert _det([f[:k] for f in m[:k]]) != 0
        assert len(d["variables"]) == n


@pytest.mark.parametrize("slug", ["gauss-seidel", "jacobi"])
def test_sistemas_iterativos_diagonal_dominante(slug):
    for d in problemas(slug):
        m = d["matriz"]
        n = len(m)
        assert n == 3 and q(d["tolerancia"]) > 0
        # existe un orden de las ecuaciones con diagonal estrictamente dominante (p.37)
        assert any(es_diagonal_dominante([m[i] for i in orden]) for orden in itertools.permutations(range(n)))
        assert _det([[q(v) for v in f[:n]] for f in m]) != 0


def test_iterativos_incluyen_sistemas_ya_dominantes_y_por_reordenar():
    estados = {es_diagonal_dominante(d["matriz"]) for d in problemas("jacobi")}
    assert estados == {True, False}


def test_raices_de_polinomios_tienen_raiz_entera_divisor_del_termino_independiente():
    for d in problemas("raices-polinomios"):
        c = [int(v) for v in d["coeficientes"]]
        assert c[0] == 1 and 3 <= len(c) <= 4 and c[-1] != 0 and abs(c[-1]) <= 60
        raices = [x for x in range(-abs(c[-1]), abs(c[-1]) + 1) if x != 0 and c[-1] % x == 0
                  and sum(ci * x ** (len(c) - 1 - i) for i, ci in enumerate(c)) == 0]
        assert raices, "debe tener una raíz entera (divisor del término independiente)"


# --------------------------------------------------------------------------------------------
# Unidad II · 4 Mínimos cuadrados
# --------------------------------------------------------------------------------------------
@pytest.mark.parametrize("slug,minimo", [("linea-recta", 4), ("cuadratica", 5), ("cubica", 6),
                                         ("lineal-con-funcion", 4), ("cuadratica-con-funcion", 5)])
def test_minimos_cuadrados_datos(slug, minimo):
    for d in problemas(slug):
        xs, ys = _xs_ys(d)
        assert len(xs) == len(ys) >= minimo
        assert all(xs[i] < xs[i + 1] for i in range(len(xs) - 1))  # x distintos y ordenados
        assert all(y > 0 for y in ys) and xs[0] >= 1 and xs[-1] <= 11
        assert all(v.denominator in (1, 2, 5, 10) for v in xs + ys)  # un decimal, como el libro
        if "funcion" in d:
            f = f_de(d["funcion"])
            vals = [f(mpf(v.numerator) / v.denominator) for v in xs]
            assert all(mpmath.isfinite(v) and abs(v) < 5e3 for v in vals)  # sin polos cerca de los datos
            assert d["funcion"] in {"sen(x)", "cos(x)", "tg(x)", "ctg(x)", "Ln(x)", "e^x"}


# --------------------------------------------------------------------------------------------
# Unidad III · 5 Integración
# --------------------------------------------------------------------------------------------
@pytest.mark.parametrize("slug,regla", [
    ("trapezoidal", lambda n: n >= 1),
    ("newton-cotes-cerradas", lambda n: 1 <= n <= 10),
    ("newton-cotes-abiertas", lambda n: 1 <= n <= 6),
    ("simpson-1-3", lambda n: n % 2 == 0 and n >= 2),
    ("simpson-3-8", lambda n: n == 3),
])
def test_integracion_n_y_limites(slug, regla):
    for d in problemas(slug):
        assert q(d["a"]) < q(d["b"])  # h = (b − a)/n siempre positivo
        assert regla(d["n"])
        f = f_de(d["funcion"])
        a, b = float(q(d["a"])), float(q(d["b"]))
        assert all(mpmath.isfinite(f(mpf(a + (b - a) * i / 20))) for i in range(21))


# --------------------------------------------------------------------------------------------
# Unidad IV · 6 EDO
# --------------------------------------------------------------------------------------------
EDOS = ["euler-adelante", "euler-atras", "euler-modificado", "runge-kutta-2", "runge-kutta-3",
        "runge-kutta-4-simpson-1-3", "runge-kutta-4-simpson-3-8"]


@pytest.mark.parametrize("slug", EDOS)
def test_edo_parametros(slug):
    for d in problemas(slug):
        assert q(d["h"]) > 0 and d["t0"] == "0" and 1 <= d["pasos"] <= 2  # el libro parte siempre de t_0 = 0
        f_de(d["funcion"], "y", "t")  # solo variables del libro: y, t
        if slug == "euler-modificado":
            assert d["y_siguiente"] == d["y0"]  # y_1 = y_0 dentro de f (p.66)


def test_orden_superior_solo_variables_del_libro():
    for d in problemas("runge-kutta-orden-superior"):
        f_de(d["funcion"], "V", "U", "q")  # V = y', U = y, q = t
        assert q(d["h"]) > 0 and d["q0"] == "0" and d["pasos"] >= 1 and q(d["y0"]) != 0


# --------------------------------------------------------------------------------------------
# API
# --------------------------------------------------------------------------------------------
@pytest.mark.parametrize("slug", sorted(REGISTRO))
def test_endpoint_problema_se_resuelve_por_la_api(cliente, slug):
    r = cliente.get(f"/api/metodos/{slug}/problema")
    assert r.status_code == 200, r.text
    cuerpo = r.json()
    assert cuerpo["slug"] == slug
    calculo = cliente.post(f"/api/calcular/{slug}", json=cuerpo["entrada"])
    assert calculo.status_code == 200, calculo.text


def test_endpoint_problema_semilla_y_404(cliente):
    a = cliente.get("/api/metodos/newton-adelante/problema?semilla=11").json()
    b = cliente.get("/api/metodos/newton-adelante/problema?semilla=11").json()
    c = cliente.get("/api/metodos/newton-adelante/problema?semilla=12").json()
    assert a == b and a != c
    assert cliente.get("/api/metodos/no-existe/problema").status_code == 404


# --------------------------------------------------------------------------------------------
# Verificación de restricciones antes de mostrar el problema (use_cases/restricciones.py)
# --------------------------------------------------------------------------------------------
from app.presentation.problemas import revisar_problema  # noqa: E402
from app.use_cases.restricciones import REGLAS, incumplimientos  # noqa: E402


def test_todos_los_metodos_con_problema_tienen_reglas():
    assert set(REGISTRO) - set(REGLAS) == {"tablas-newton-cotes"}


@pytest.mark.parametrize("slug", sorted(REGLAS))
def test_ejemplo_del_libro_y_problemas_generados_cumplen_restricciones(slug):
    assert incumplimientos(slug, REGISTRO[slug].ejemplo, crear_funcion) == []
    for d in problemas(slug, range(10)):
        assert incumplimientos(slug, d, crear_funcion) == []


@pytest.mark.parametrize("slug,cambio", [
    ("newton-adelante", {"x": ["1", "2", "4", "5"], "y": ["1", "2", "3", "4"]}),   # h no uniforme
    ("diferencias-divididas", {"x": ["1", "2", "3", "4"], "y": ["1", "3", "2", "5"]}),  # h uniforme
    ("bisectriz", {"funcion": "x - 2", "a": "0", "b": "5"}),                       # f(a) < 0
    ("falsa-posicion", {"funcion": "x^2 + 1", "a": "0", "b": "3"}),                # sin cambio de signo
    ("gauss-seidel", {"matriz": [["1", "5", "1", "2"], ["1", "1", "5", "2"], ["1", "5", "1", "3"]]}),
    ("montante", {"matriz": [["0", "1", "1", "2"], ["1", "1", "1", "2"], ["2", "1", "3", "1"]]}),
    ("simpson-1-3", {"n": 3}),
    ("simpson-3-8", {"n": 6}),
    ("newton-cotes-abiertas", {"n": 9}),
    ("linea-recta", {"x": ["1", "1", "2"], "y": ["1", "2", "3"]}),
])
def test_datos_que_no_cumplen_se_detectan_y_se_cambian(slug, cambio):
    metodo = REGISTRO[slug]
    roto = {**metodo.ejemplo, **cambio}
    assert incumplimientos(slug, roto, crear_funcion), f"{slug}: debía detectar la restricción violada"
    datos, _, reemplazado = revisar_problema(metodo, roto, random.Random(1))
    assert reemplazado and incumplimientos(slug, datos, crear_funcion) == []


def test_datos_ilegibles_tambien_se_cambian():
    assert incumplimientos("lagrange", {"x": "hola"}, crear_funcion)
    datos, _, reemplazado = revisar_problema(REGISTRO["lagrange"], None)
    assert reemplazado and datos
