from fastapi.testclient import TestClient

from app.main import app


def test_salud():
    cliente = TestClient(app)
    assert cliente.get("/api/salud").json() == {"estado": "ok"}
