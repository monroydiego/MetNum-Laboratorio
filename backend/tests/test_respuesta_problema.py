"""Verificación de la respuesta del alumno: parte entera y 3 decimales; la resolución solo se entrega si acierta."""
import random
from decimal import Decimal

import pytest

import app.presentation.metodos  # noqa: F401
from tests.conftest import verificar
from app.presentation.problemas import problema_con_resultado
from app.presentation.registro import REGISTRO
from app.use_cases import respuesta_problema as rp


@pytest.mark.parametrize("esperado,dado,ok", [
    ("1.234567891", "1.234", True),      # truncado a 3 decimales
    ("1.234567891", "1.235", True),      # redondeado a 3 decimales
    ("1.234567891", "1.2345", True),
    ("1.234567891", "1.236", False),     # difiere en el 3.er decimal
    ("1.234567891", "1.23", False),      # 1.230 ≠ 1.234/1.235
    ("1.234567891", "2.234", False),     # difiere en la parte entera
    ("-2.5", "-2.500", True),
    ("-2.5", "2.5", False),
    ("-2.5", "-5/2", True),              # fracciones
    ("3", "3,000", True),                # coma decimal
    ("0.0004", "0", True),
    ("0.0006", "0.001", True),
    ("0.0006", "0", True),               # truncado
    ("0.0006", "0.002", False),
    ("5", "", False),
    ("5", "abc", False),
])
def test_coinciden(esperado, dado, ok):
    assert rp.coinciden(esperado, dado) is ok


def _por_slug():
    return sorted(s for s in REGISTRO if rp.tiene_respuesta(s))


def test_tabla_de_constantes_no_tiene_respuesta():
    assert not rp.tiene_respuesta("tablas-newton-cotes")
    assert set(REGISTRO) - set(_por_slug()) == {"tablas-newton-cotes"}


@pytest.mark.parametrize("slug", _por_slug())
def test_campos_y_verificacion_por_metodo(slug):
    metodo = REGISTRO[slug]
    for semilla in range(8):
        _, resultado = problema_con_resultado(metodo, random.Random(semilla))
        esperados = rp.valores_esperados(slug, resultado.resultado)
        assert esperados, f"{slug} no define campos de respuesta"
        assert all(Decimal(rp._a_decimal(v)) is not None for v in esperados.values())
        # respuesta correcta -> todo bien (con 9 decimales, truncada y redondeada a 3)
        assert rp.es_correcta(rp.verificar(slug, resultado.resultado, esperados))
        a3 = {k: str(rp._a_decimal(v).quantize(Decimal("0.001"))) for k, v in esperados.items()}
        assert rp.es_correcta(rp.verificar(slug, resultado.resultado, a3))
        # una respuesta con otro valor (+0.002) en cualquier campo es incorrecta
        for clave in esperados:
            mala = dict(esperados)
            mala[clave] = str(rp._a_decimal(esperados[clave]) + Decimal("0.002"))
            veredicto = rp.verificar(slug, resultado.resultado, mala)
            if slug == "raices-polinomios":
                assert not rp.es_correcta(veredicto)
            else:
                assert veredicto[clave] is False and not rp.es_correcta(veredicto)
        # campo vacío -> incorrecto
        assert not rp.es_correcta(rp.verificar(slug, resultado.resultado, {}))


def test_raices_de_polinomio_en_cualquier_orden():
    resultado = {"x₁": "-3", "x₂": "1.5", "x₃": "4"}
    assert rp.es_correcta(rp.verificar("raices-polinomios", resultado, {"x₁": "4", "x₂": "-3", "x₃": "1.5"}))
    assert not rp.es_correcta(rp.verificar("raices-polinomios", resultado, {"x₁": "4", "x₂": "4", "x₃": "1.5"}))


@pytest.mark.parametrize("slug", _por_slug())
def test_api_correcta_entrega_resolucion_e_incorrecta_no(cliente_bd, slug):
    cliente, raiz = cliente_bd
    problema = cliente.get(f"/api/metodos/{slug}/problema?semilla=3").json()
    assert problema["campos_respuesta"]
    resultado = cliente.post(f"/api/calcular/{slug}", json=problema["entrada"]).json()["resultado"]
    esperados = rp.valores_esperados(slug, resultado)
    assert list(esperados) == problema["campos_respuesta"]
    ok = verificar(cliente, slug, problema["entrada"], esperados).json()
    assert ok["correcta"] is True and ok["resultado"]["pasos"] is not None and ok["folio"] > 0
    mala = {k: str(rp._a_decimal(v) + Decimal("1")) for k, v in esperados.items()}
    r = verificar(cliente, slug, problema["entrada"], mala).json()
    assert r["correcta"] is False and r["resultado"] is None
    if slug != "raices-polinomios":  # (x₁ + 1 puede ser otra raíz del mismo polinomio)
        assert not any(r["campos"].values())
    # los dos intentos quedaron en la BD con su foto, para el Panel Docente
    intentos = cliente.get("/api/evidencias", params={"matricula": "1234567"}).json()
    assert [i["correcta"] for i in intentos] == [False, True]
    assert all(i["foto_procedimiento_url"].startswith("/uploads/evidencias/") and i["foto_canvas_url"] == "" for i in intentos)
    assert len(list((raiz / "evidencias").iterdir())) == 2


def test_api_errores(cliente_bd):
    cliente, _ = cliente_bd
    assert verificar(cliente, "nada", {}, {}).status_code == 404
    assert verificar(cliente, "tablas-newton-cotes", {}, {}).status_code == 422
    assert verificar(cliente, "lagrange", {}, {}).status_code == 422
    assert cliente.get("/api/metodos/tablas-newton-cotes/problema").json()["campos_respuesta"] == []


def test_api_foto_obligatoria_y_valida(cliente_bd):
    cliente, raiz = cliente_bd
    problema = cliente.get("/api/metodos/lagrange/problema?semilla=1").json()
    respuesta = {"g(x)": "0"}
    assert verificar(cliente, "lagrange", problema["entrada"], respuesta, foto=None).status_code == 422
    falsa = verificar(cliente, "lagrange", problema["entrada"], respuesta, foto=b"no soy una imagen")
    assert falsa.status_code == 422 and "imagen" in falsa.json()["detail"]
    sin_matricula = verificar(cliente, "lagrange", problema["entrada"], respuesta, matricula=" ")
    assert sin_matricula.status_code == 422
    assert not list((raiz / "evidencias").iterdir())  # nada se guardó sin una foto válida


def test_api_revisar_conserva_problema_valido_y_cambia_el_invalido(cliente):
    problema = cliente.get("/api/metodos/simpson-1-3/problema?semilla=5").json()
    igual = cliente.post("/api/problemas/revisar", json={"slug": "simpson-1-3", "entrada": problema["entrada"]}).json()
    assert igual["reemplazado"] is False and igual["entrada"] == problema["entrada"]
    roto = dict(problema["entrada"], n=3)  # 1/3 de Simpson requiere n par
    nuevo = cliente.post("/api/problemas/revisar", json={"slug": "simpson-1-3", "entrada": roto}).json()
    assert nuevo["reemplazado"] is True and nuevo["entrada"]["n"] % 2 == 0 and nuevo["campos_respuesta"] == ["I"]
    basura = cliente.post("/api/problemas/revisar", json={"slug": "jacobi", "entrada": {"x": 1}}).json()
    assert basura["reemplazado"] is True
