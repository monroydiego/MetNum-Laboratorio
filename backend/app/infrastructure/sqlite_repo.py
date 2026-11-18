"""Implementación de IEvidenciaRepo en SQLite (SQLAlchemy 2.x)."""
from datetime import datetime, timezone

from sqlalchemy import case, delete, func, select
from sqlalchemy.orm import sessionmaker

from app.domain.entities import Docente, EvidenciaPartida
from app.domain.repositories import EvidenciaGuardada, IDocenteRepo, IEvidenciaRepo, IRecordRepo, ResumenMatricula
from app.infrastructure.database import DocenteModel, EvidenciaModel, RecordModel, SesionModel, SessionLocal


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

    def resumen_por_matricula(self) -> list[ResumenMatricula]:
        with self._sesiones() as s:
            filas = s.execute(
                select(
                    EvidenciaModel.matricula,
                    func.count(EvidenciaModel.id),
                    func.coalesce(func.sum(case((EvidenciaModel.correcta.is_(True), 1), else_=0)), 0),
                    func.coalesce(func.sum(case((EvidenciaModel.correcta.is_(False), 1), else_=0)), 0),
                    func.max(EvidenciaModel.fecha_registro),
                )
                .group_by(EvidenciaModel.matricula)
                .order_by(func.max(EvidenciaModel.id).desc())
            ).all()
            records = dict(s.execute(select(RecordModel.matricula, func.min(RecordModel.tiempo_ms)).group_by(RecordModel.matricula)).all())
            return [
                ResumenMatricula(m, int(n), int(ok), int(mal), f.isoformat() if f else "", records.get(m))
                for m, n, ok, mal, f in filas
            ]


class SQLiteRecordRepo(IRecordRepo):
    def __init__(self, sesiones: sessionmaker = SessionLocal) -> None:
        self._sesiones = sesiones

    def mejor(self, matricula: str) -> int | None:
        with self._sesiones() as s:
            return s.scalar(select(func.min(RecordModel.tiempo_ms)).where(RecordModel.matricula == matricula))

    def registrar(self, matricula: str, modo: str, tiempo_ms: int, puntos: int) -> None:
        with self._sesiones() as s:
            s.add(RecordModel(matricula=matricula, modo=modo, tiempo_ms=tiempo_ms, puntos=puntos))
            s.commit()


class SQLiteDocenteRepo(IDocenteRepo):
    def __init__(self, sesiones: sessionmaker = SessionLocal) -> None:
        self._sesiones = sesiones

    def por_correo(self, correo: str) -> tuple[Docente, str] | None:
        with self._sesiones() as s:
            m = s.scalar(select(DocenteModel).where(DocenteModel.correo == correo))
            return (Docente(m.id, m.correo), m.clave_hash) if m else None

    def guardar_sesion(self, token_hash: str, docente_id: int, expira: datetime) -> None:
        with self._sesiones() as s:
            s.execute(delete(SesionModel).where(SesionModel.expira < datetime.now(timezone.utc).replace(tzinfo=None)))  # limpia caducadas
            s.add(SesionModel(token_hash=token_hash, docente_id=docente_id, expira=expira))
            s.commit()

    def docente_de_sesion(self, token_hash: str, ahora: datetime) -> Docente | None:
        with self._sesiones() as s:
            ses = s.get(SesionModel, token_hash)
            if ses is None or ses.expira < ahora:
                return None
            m = s.get(DocenteModel, ses.docente_id)
            return Docente(m.id, m.correo) if m else None

    def cerrar_sesion(self, token_hash: str) -> None:
        with self._sesiones() as s:
            s.execute(delete(SesionModel).where(SesionModel.token_hash == token_hash))
            s.commit()


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
