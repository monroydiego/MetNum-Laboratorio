"""Matrícula: exactamente 7 dígitos, en el caso de uso y como disparador de SQLite."""
import pytest
from sqlalchemy import create_engine, text

from app.domain.funciones import ErrorMetodo
from app.domain.matricula import validar_matricula
from app.infrastructure.database import _disparador_matricula


@pytest.mark.parametrize("valor", ["2067988", "1234567", " 2067988 "])
def test_acepta_exactamente_siete_digitos(valor):
    assert validar_matricula(valor) == valor.strip()


@pytest.mark.parametrize("valor", ["", "   ", "1", "12", "123456", "12345678", "QA-PRUEBA", "12a", "12 3", "ñ1234567", "1.5", "-7"])
def test_rechaza_cualquier_longitud_distinta_de_siete_o_con_simbolos(valor):
    with pytest.raises(ErrorMetodo, match="exactamente 7 dígitos"):
        validar_matricula(valor)


def test_disparador_sqlite_rechaza_matriculas_que_no_son_de_siete_digitos(tmp_path):
    motor = create_engine(f"sqlite:///{tmp_path / 'm.db'}")
    with motor.begin() as con:
        con.execute(text("CREATE TABLE records_tiempo (id INTEGER PRIMARY KEY, matricula VARCHAR(20) NOT NULL)"))
        con.execute(text(_disparador_matricula("records_tiempo", "INSERT")))
    with motor.begin() as con:
        con.execute(text("INSERT INTO records_tiempo (matricula) VALUES ('2067988')"))
    for invalida in ["1", "QA-PRUEBA", "12345678", "12a", ""]:
        with pytest.raises(Exception, match="exactamente 7 dígitos"), motor.begin() as con:
            con.execute(text("INSERT INTO records_tiempo (matricula) VALUES (:m)"), {"m": invalida})
