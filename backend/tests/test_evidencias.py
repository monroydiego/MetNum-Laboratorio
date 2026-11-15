"""Modo Comprobación Docente: guardado de fotos en disco + registro en SQLite (BD temporal)."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.infrastructure.database import Base
from app.infrastructure.local_storage import LocalFileStorage
from app.infrastructure.sqlite_repo import SQLiteEvidenciaRepo
from app.main import app
from app.presentation.routes_docente import obtener_caso_uso
from app.use_cases.gestionar_evidencia import GestionarEvidencia

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


@pytest.fixture()
def cliente_aislado(tmp_path: Path):
    motor = create_engine(f"sqlite:///{tmp_path / 'prueba.db'}")
    Base.metadata.create_all(motor)
    sesiones = sessionmaker(bind=motor)
    almacen = LocalFileStorage(raiz=tmp_path)
    app.dependency_overrides[obtener_caso_uso] = lambda: GestionarEvidencia(
        SQLiteEvidenciaRepo(sesiones), almacen
    )
    yield TestClient(app), tmp_path
    app.dependency_overrides.clear()


def _enviar(cliente, **extra):
    datos = {
        "matricula": "1234567",
        "nivel": "1",
        "metodo": "interpolacion-lineal",
        "funcion": "Ln(x)",
        "resultado_exacto": "1.304007668123456789012345",
        "error": "0.082286693",
        "iteraciones_json": json.dumps([{"i": "1", "x": "0.5"}]),
        **extra,
    }
    archivos = {
        "foto_procedimiento": ("proc.png", PNG, "image/png"),
        "foto_canvas": ("canvas.png", PNG, "image/png"),
    }
    return cliente.post("/api/evidencias", data=datos, files=archivos)


def test_registrar_y_listar_evidencia(cliente_aislado):
    cliente, raiz = cliente_aislado
    r = _enviar(cliente)
    assert r.status_code == 200, r.text
    ev = r.json()
    # Sin truncar la precisión
    assert ev["resultado_exacto"] == "1.304007668123456789012345"
    assert ev["iteraciones_json"] == [{"i": "1", "x": "0.5"}]
    # Solo rutas en BD; los archivos existen en disco
    for clave in ("foto_procedimiento_url", "foto_canvas_url"):
        assert ev[clave].startswith("/uploads/evidencias/")
        assert (raiz / "evidencias" / Path(ev[clave]).name).read_bytes() == PNG

    lista = cliente.get("/api/evidencias", params={"matricula": "1234567"}).json()
    assert [e["id"] for e in lista] == [ev["id"]]


def test_rechaza_formato_no_imagen(cliente_aislado):
    cliente, raiz = cliente_aislado
    r = cliente.post(
        "/api/evidencias",
        data={"matricula": "1", "nivel": "1", "metodo": "m", "funcion": "f",
              "resultado_exacto": "1", "iteraciones_json": "[]"},
        files={"foto_procedimiento": ("a.txt", b"hola", "text/plain"),
               "foto_canvas": ("c.png", PNG, "image/png")},
    )
    assert r.status_code == 422
    assert not list((raiz / "evidencias").iterdir())


def test_error_vacio_es_null(cliente_aislado):
    cliente, _ = cliente_aislado
    r = _enviar(cliente, error="")
    assert r.status_code == 200
    assert r.json()["error"] is None
