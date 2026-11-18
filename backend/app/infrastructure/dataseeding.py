"""Sembrado de datos: se ejecuta en CADA arranque del backend (ver app/main.py).

Garantiza que siempre exista la cuenta de docente para entrar al Modo profesor y al Panel Docente.
Es idempotente: si la cuenta ya existe no se duplica y, si su clave cambió, se restablece a la semilla.
Las credenciales pueden sobrescribirse con las variables de entorno DOCENTE_CORREO y DOCENTE_CLAVE.
"""
import os

from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from app.infrastructure.database import DocenteModel, SessionLocal
from app.infrastructure.seguridad import hashear_clave, verificar_clave

CORREO_DOCENTE = os.getenv("DOCENTE_CORREO", "docente0043@gmail.com")
CLAVE_DOCENTE = os.getenv("DOCENTE_CLAVE", "docente0043")


def sembrar_datos(sesiones: sessionmaker = SessionLocal) -> None:
    sembrar_docente(sesiones)


def sembrar_docente(sesiones: sessionmaker = SessionLocal) -> None:
    correo = CORREO_DOCENTE.strip().lower()
    with sesiones() as s:
        docente = s.scalar(select(DocenteModel).where(DocenteModel.correo == correo))
        if docente is None:
            s.add(DocenteModel(correo=correo, clave_hash=hashear_clave(CLAVE_DOCENTE)))
        elif not verificar_clave(CLAVE_DOCENTE, docente.clave_hash):
            docente.clave_hash = hashear_clave(CLAVE_DOCENTE)
        s.commit()
