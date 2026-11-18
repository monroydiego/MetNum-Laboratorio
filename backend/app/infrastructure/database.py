from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, Integer, String, create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

BACKEND_DIR = Path(__file__).resolve().parents[2]  # backend/
DATA_DIR = BACKEND_DIR / "data"
UPLOADS_DIR = BACKEND_DIR / "uploads"
DATA_DIR.mkdir(exist_ok=True)
DATABASE_URL = f"sqlite:///{DATA_DIR / 'auditoria_docente.db'}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class EvidenciaModel(Base):
    __tablename__ = "evidencias_comprobacion"

    id = Column(Integer, primary_key=True, index=True)
    matricula = Column(String(20), index=True, nullable=False)
    nivel = Column(Integer, nullable=False)
    metodo = Column(String(60), nullable=False)
    funcion = Column(String(255), nullable=False)
    resultado_exacto = Column(String(500), nullable=False)  # str: preserva la precisión de mpmath
    error = Column(Float, nullable=True)  # Margen de Error Є del libro (None si el método no lo define)
    iteraciones_json = Column(JSON, nullable=False)  # Tabla completa (filas como str)
    foto_procedimiento_url = Column(String(255), nullable=False)  # solo la ruta, nunca el binario
    foto_canvas_url = Column(String(255), nullable=False)  # "" en los intentos de respuesta del juego
    correcta = Column(Boolean, nullable=True)  # intento del juego: ¿respuesta correcta? (None = Modo Comprobación)
    fecha_registro = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class RecordModel(Base):
    """Misión completada (victoria sobre OMEGA). El récord de una matrícula es su menor `tiempo_ms`."""

    __tablename__ = "records_tiempo"

    id = Column(Integer, primary_key=True, index=True)
    matricula = Column(String(20), index=True, nullable=False)
    modo = Column(String(20), nullable=False)  # campana | contrarreloj
    tiempo_ms = Column(Integer, nullable=False)
    puntos = Column(Integer, nullable=False)
    fecha_registro = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DocenteModel(Base):
    """Cuenta de docente (Modo profesor y Panel Docente). La clave se guarda solo como hash scrypt."""

    __tablename__ = "docentes"

    id = Column(Integer, primary_key=True, index=True)
    correo = Column(String(120), unique=True, index=True, nullable=False)
    clave_hash = Column(String(255), nullable=False)


class SesionModel(Base):
    """Sesión activa del docente: se guarda el hash SHA-256 del token, nunca el token."""

    __tablename__ = "sesiones_docente"

    token_hash = Column(String(64), primary_key=True)
    docente_id = Column(Integer, nullable=False, index=True)
    expira = Column(DateTime, nullable=False)


def preparar_bd() -> None:
    """Crea las tablas. Migra el esquema previo (columna error_porcentual) si la tabla está vacía."""
    columnas = (
        {c["name"] for c in inspect(engine).get_columns(EvidenciaModel.__tablename__)}
        if inspect(engine).has_table(EvidenciaModel.__tablename__)
        else set()
    )
    if "error_porcentual" in columnas:
        with engine.begin() as con:
            filas = con.execute(text(f"SELECT COUNT(*) FROM {EvidenciaModel.__tablename__}")).scalar()
            if filas:
                raise RuntimeError(
                    "La tabla evidencias_comprobacion tiene el esquema anterior con datos; "
                    "respáldala y migra manualmente error_porcentual -> error."
                )
            EvidenciaModel.__table__.drop(con)
    Base.metadata.create_all(bind=engine)
    if columnas and "correcta" not in columnas:
        # Esquema anterior sin la columna de los intentos de respuesta: se agrega sin perder datos.
        with engine.begin() as con:
            con.execute(text(f"ALTER TABLE {EvidenciaModel.__tablename__} ADD COLUMN correcta BOOLEAN"))
