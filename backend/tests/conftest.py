"""Utilidades de prueba compartidas."""
from decimal import Decimal

import mpmath
import pytest
from fastapi.testclient import TestClient

from app.main import app

mpmath.mp.dps = 50  # referencia a 50 cifras


@pytest.fixture(scope="session")
def cliente() -> TestClient:
    return TestClient(app)


def cerca(obtenido: str, esperado: str | float | mpmath.mpf, tol: str = "1e-9") -> bool:
    """Compara el str del motor contra el valor del libro con ±1 en el 9.º decimal.

    El libro mezcla redondeo y truncamiento, por eso la tolerancia (ver resumen del método).
    """
    return abs(Decimal(obtenido) - Decimal(mpmath.nstr(mpmath.mpf(esperado), 40))) <= Decimal(tol)
