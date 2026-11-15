"""Utilidades de prueba compartidas."""
from decimal import Decimal

import mpmath
import pytest
from fastapi.testclient import TestClient

from app.main import app

mpmath.mp.dps = 50  # referencia a 50 cifras


PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


@pytest.fixture(scope="session")
def cliente() -> TestClient:
    return TestClient(app)


@pytest.fixture()
def cliente_bd(tmp_path):
    """Cliente con BD SQLite y carpeta de fotos temporales (no toca auditoria_docente.db)."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.infrastructure.database import Base
    from app.infrastructure.local_storage import LocalFileStorage
    from app.infrastructure.sqlite_repo import SQLiteEvidenciaRepo
    from app.presentation.routes_docente import obtener_caso_uso
    from app.use_cases.gestionar_evidencia import GestionarEvidencia

    motor = create_engine(f"sqlite:///{tmp_path / 'prueba.db'}")
    Base.metadata.create_all(motor)
    sesiones = sessionmaker(bind=motor)
    almacen = LocalFileStorage(raiz=tmp_path)
    app.dependency_overrides[obtener_caso_uso] = lambda: GestionarEvidencia(SQLiteEvidenciaRepo(sesiones), almacen)
    yield TestClient(app), tmp_path
    app.dependency_overrides.clear()


def verificar(cliente: TestClient, slug: str, entrada, respuesta, *, foto: bytes | None = PNG, matricula="1234567"):
    """POST /api/problemas/verificar (multipart con la foto obligatoria del procedimiento)."""
    import json

    archivos = {"foto_procedimiento": ("proc.png", foto, "image/png")} if foto is not None else None
    datos = {"slug": slug, "entrada": json.dumps(entrada), "respuesta": json.dumps(respuesta), "matricula": matricula, "nivel": "1"}
    return cliente.post("/api/problemas/verificar", data=datos, files=archivos)


def cerca(obtenido: str, esperado: str | float | mpmath.mpf, tol: str = "1e-9") -> bool:
    """Compara el str del motor contra el valor del libro con ±1 en el 9.º decimal.

    El libro mezcla redondeo y truncamiento, por eso la tolerancia (ver resumen del método).
    """
    return abs(Decimal(obtenido) - Decimal(mpmath.nstr(mpmath.mpf(esperado), 40))) <= Decimal(tol)
