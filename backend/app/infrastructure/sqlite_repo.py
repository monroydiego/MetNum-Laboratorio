"""Implementación de IEvidenciaRepo en SQLite (SQLAlchemy 2.x)."""
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from app.domain.entities import EvidenciaPartida
from app.domain.repositories import EvidenciaGuardada, IEvidenciaRepo
from app.infrastructure.database import EvidenciaModel, SessionLocal


class SQLiteEvidenciaRepo(IEvidenciaRepo):
    def __init__(self, sesiones: sessionmaker = SessionLocal) -> None:
        self._sesiones = sesiones

    def guardar(self, evidencia: EvidenciaPartida) -> EvidenciaGuardada:
        with self._sesiones() as s:
            modelo = EvidenciaModel(
                matricula=evidencia.matricula,
                nivel=evidencia.nivel,
                metodo=evidencia.metodo,
                funcion=evidencia.funcion,
                resultado_exacto=evidencia.resultado_exacto,
                error=evidencia.error,
                iteraciones_json=evidencia.iteraciones,
                foto_procedimiento_url=evidencia.foto_procedimiento_url,
                foto_canvas_url=evidencia.foto_canvas_url,
                correcta=evidencia.correcta,
            )
            s.add(modelo)
            s.commit()
            s.refresh(modelo)
            return _a_dominio(modelo)

    def ultimas(self, limite: int = 50, matricula: str | None = None) -> list[EvidenciaGuardada]:
        with self._sesiones() as s:
            consulta = select(EvidenciaModel).order_by(EvidenciaModel.id.desc()).limit(limite)
            if matricula:
                consulta = consulta.where(EvidenciaModel.matricula == matricula)
            return [_a_dominio(m) for m in s.scalars(consulta)]


def _a_dominio(m: EvidenciaModel) -> EvidenciaGuardada:
    return EvidenciaGuardada(
        id=m.id,
        fecha_registro=m.fecha_registro.isoformat() if m.fecha_registro else "",
        evidencia=EvidenciaPartida(
            matricula=m.matricula,
            nivel=m.nivel,
            metodo=m.metodo,
            funcion=m.funcion,
            resultado_exacto=m.resultado_exacto,
            error=m.error,
            iteraciones=list(m.iteraciones_json or []),
            foto_procedimiento_url=m.foto_procedimiento_url,
            foto_canvas_url=m.foto_canvas_url,
            correcta=m.correcta,
        ),
    )
