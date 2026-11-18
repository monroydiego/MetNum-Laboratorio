"""Caso de uso: inicio y cierre de sesión del docente. Sin fastapi ni sqlalchemy."""
from datetime import datetime, timedelta, timezone

from app.domain.entities import Docente
from app.domain.funciones import ErrorMetodo
from app.domain.repositories import IDocenteRepo
from app.infrastructure.seguridad import hash_token, hashear_clave, nuevo_token, verificar_clave

DURACION_SESION = timedelta(hours=8)
MAX_FALLOS = 5
BLOQUEO = timedelta(minutes=1)
_CLAVE_FALSA = hashear_clave("sin-cuenta")  # iguala el tiempo de respuesta cuando el correo no existe


class CredencialesInvalidas(ErrorMetodo):
    pass


class DemasiadosIntentos(ErrorMetodo):
    pass


class AutenticarDocente:
    # Fallos recientes por correo (en memoria: se reinicia con el servidor).
    _fallos: dict[str, tuple[int, datetime]] = {}

    def __init__(self, repo: IDocenteRepo) -> None:
        self._repo = repo

    def iniciar_sesion(self, correo: str, clave: str) -> tuple[Docente, str]:
        correo = correo.strip().lower()
        ahora = datetime.now(timezone.utc)
        n, desde = self._fallos.get(correo, (0, ahora))
        if n >= MAX_FALLOS and ahora - desde < BLOQUEO:
            raise DemasiadosIntentos("Demasiados intentos fallidos. Espera un minuto e inténtalo de nuevo.")
        encontrado = self._repo.por_correo(correo)
        ok = verificar_clave(clave, encontrado[1] if encontrado else _CLAVE_FALSA)
        if not (encontrado and ok):
            self._fallos[correo] = (1 if n >= MAX_FALLOS else n + 1, ahora)
            raise CredencialesInvalidas("Correo o contraseña incorrectos.")
        self._fallos.pop(correo, None)
        token = nuevo_token()
        self._repo.guardar_sesion(hash_token(token), encontrado[0].id, (ahora + DURACION_SESION).replace(tzinfo=None))
        return encontrado[0], token

    def docente_de(self, token: str | None) -> Docente | None:
        if not token:
            return None
        return self._repo.docente_de_sesion(hash_token(token), datetime.now(timezone.utc).replace(tzinfo=None))

    def cerrar_sesion(self, token: str | None) -> None:
        if token:
            self._repo.cerrar_sesion(hash_token(token))
