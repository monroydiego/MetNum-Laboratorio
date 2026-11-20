"""Matrícula del alumno: exactamente 7 dígitos. Regla única para el juego, el Modo Comprobación y SQLite."""
import re

from app.domain.funciones import ErrorMetodo

MATRICULA_DIGITOS = 7
MENSAJE_MATRICULA = "La matrícula debe tener exactamente 7 dígitos numéricos (sin letras ni símbolos)."
_PATRON = re.compile(rf"[0-9]{{{MATRICULA_DIGITOS}}}")


def validar_matricula(valor: str) -> str:
    """Devuelve la matrícula sin espacios o lanza ErrorMetodo (HTTP 422) con el mensaje para el usuario."""
    limpia = (valor or "").strip()
    if not _PATRON.fullmatch(limpia):
        raise ErrorMetodo(MENSAJE_MATRICULA)
    return limpia
