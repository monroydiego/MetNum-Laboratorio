"""Acceso del docente: sembrado, login, sesión por cookie y rutas protegidas (BD temporal)."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.infrastructure import dataseeding
from app.infrastructure.database import Base
from app.infrastructure.local_storage import LocalFileStorage
from app.infrastructure.sqlite_repo import SQLiteDocenteRepo, SQLiteEvidenciaRepo
from app.main import app
from app.presentation.routes_auth import obtener_autenticador
from app.presentation.routes_docente import obtener_caso_uso
from app.presentation.routes_records import obtener_registrar_record
from app.infrastructure.sqlite_repo import SQLiteRecordRepo
from app.use_cases.registrar_record import RegistrarRecord
from app.use_cases.autenticar_docente import AutenticarDocente
from app.use_cases.gestionar_evidencia import GestionarEvidencia
from app.domain.entities import EvidenciaPartida


@pytest.fixture()
def cliente_seguro(tmp_path):
    motor = create_engine(f"sqlite:///{tmp_path / 'acceso.db'}")
    Base.metadata.create_all(motor)
    sesiones = sessionmaker(bind=motor)
    dataseeding.sembrar_datos(sesiones)
    AutenticarDocente._fallos.clear()
    app.dependency_overrides[obtener_autenticador] = lambda: AutenticarDocente(SQLiteDocenteRepo(sesiones))
    app.dependency_overrides[obtener_caso_uso] = lambda: GestionarEvidencia(SQLiteEvidenciaRepo(sesiones), LocalFileStorage(raiz=tmp_path))
    app.dependency_overrides[obtener_registrar_record] = lambda: RegistrarRecord(SQLiteRecordRepo(sesiones))
    yield TestClient(app), sesiones
    app.dependency_overrides.clear()


def _evidencia(matricula: str, correcta: bool) -> EvidenciaPartida:
    return EvidenciaPartida(matricula, 1, "lagrange", "datos", "1", None, [], "/uploads/evidencias/x.png", "", correcta)


CRED = {"correo": "docente0043@gmail.com", "clave": "docente0043"}


def test_sembrado_es_idempotente(cliente_seguro):
    _, sesiones = cliente_seguro
    dataseeding.sembrar_datos(sesiones)
    dataseeding.sembrar_datos(sesiones)
    from app.infrastructure.database import DocenteModel

    with sesiones() as s:
        assert s.query(DocenteModel).count() == 1


def test_rutas_exigen_sesion(cliente_seguro):
    c, _ = cliente_seguro
    for ruta in ("/api/evidencias", "/api/docente/matriculas", "/api/docente/sesion", "/uploads/evidencias/x.png"):
        assert c.get(ruta).status_code == 401, ruta


def test_login_correcto_y_logout(cliente_seguro):
    c, _ = cliente_seguro
    r = c.post("/api/docente/login", json=CRED)
    assert r.status_code == 200 and r.json() == {"correo": CRED["correo"]}
    assert "httponly" in r.headers["set-cookie"].lower()
    assert c.get("/api/evidencias").status_code == 200
    assert c.post("/api/docente/logout").status_code == 204
    assert c.get("/api/evidencias").status_code == 401


def test_login_incorrecto_y_bloqueo(cliente_seguro):
    c, _ = cliente_seguro
    for _ in range(5):
        assert c.post("/api/docente/login", json={**CRED, "clave": "mala"}).status_code == 401
    assert c.post("/api/docente/login", json=CRED).status_code == 429


def test_resumen_de_matriculas(cliente_seguro, tmp_path):
    c, sesiones = cliente_seguro
    caso = GestionarEvidencia(SQLiteEvidenciaRepo(sesiones), LocalFileStorage(raiz=tmp_path))
    from app.domain.repositories import ResumenMatricula  # noqa: F401

    caso._repo.guardar(_evidencia("1111111", True))
    caso._repo.guardar(_evidencia("1111111", False))
    caso._repo.guardar(_evidencia("2222222", True))
    c.post("/api/docente/login", json=CRED)
    resumen = {m["matricula"]: m for m in c.get("/api/docente/matriculas").json()}
    assert resumen["1111111"]["intentos"] == 2 and resumen["1111111"]["correctos"] == 1 and resumen["1111111"]["incorrectos"] == 1
    assert resumen["2222222"]["intentos"] == 1


def test_record_por_matricula_y_columna_en_panel(cliente_seguro):
    c, sesiones = cliente_seguro
    caso = GestionarEvidencia(SQLiteEvidenciaRepo(sesiones), None)
    caso._repo.guardar(_evidencia("3333333", True))
    r = c.post("/api/records", json={"matricula": "3333333", "modo": "campana", "tiempo_ms": 900000, "puntos": 1500}).json()
    assert r == {"tiempo_ms": 900000, "record_ms": 900000, "nuevo_record": True}
    r = c.post("/api/records", json={"matricula": "3333333", "modo": "contrarreloj", "tiempo_ms": 950000, "puntos": 1500}).json()
    assert r["record_ms"] == 900000 and not r["nuevo_record"]
    r = c.post("/api/records", json={"matricula": "3333333", "modo": "campana", "tiempo_ms": 800000, "puntos": 1500}).json()
    assert r["nuevo_record"] and r["record_ms"] == 800000
    assert c.get("/api/records/3333333").json() == {"record_ms": 800000}
    c.post("/api/docente/login", json=CRED)
    fila = next(m for m in c.get("/api/docente/matriculas").json() if m["matricula"] == "3333333")
    assert fila["record_ms"] == 800000


def test_record_rechaza_practica_y_sin_matricula(cliente_seguro):
    c, _ = cliente_seguro
    base = {"matricula": "1", "modo": "practica", "tiempo_ms": 900000, "puntos": 0}
    assert c.post("/api/records", json=base).status_code == 422
    assert c.post("/api/records", json={**base, "modo": "campana", "matricula": " "}).status_code == 422
    assert c.post("/api/records", json={**base, "modo": "campana", "tiempo_ms": 5}).status_code == 422
