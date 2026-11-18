"""Acceso del docente: POST /api/docente/login, POST /api/docente/logout, GET /api/docente/sesion.

La sesión viaja en una cookie HttpOnly + SameSite=Strict (el navegador la manda sola, también al
pedir las fotos de /uploads). `exigir_docente` protege las rutas del Panel y del Modo profesor.
"""
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from app.domain.entities import Docente
from app.infrastructure.sqlite_repo import SQLiteDocenteRepo
from app.presentation.schemas import ErrorOut
from app.use_cases.autenticar_docente import (
    DURACION_SESION,
    AutenticarDocente,
    CredencialesInvalidas,
    DemasiadosIntentos,
)

COOKIE = "sesion_docente"
router = APIRouter(prefix="/api/docente", tags=["acceso docente"])


def obtener_autenticador() -> AutenticarDocente:
    return AutenticarDocente(SQLiteDocenteRepo())


def exigir_docente(
    token: str | None = Cookie(None, alias=COOKIE),
    auth: AutenticarDocente = Depends(obtener_autenticador),
) -> Docente:
    docente = auth.docente_de(token)
    if docente is None:
        raise HTTPException(status_code=401, detail="Inicia sesión como docente para continuar.")
    return docente


class LoginIn(BaseModel):
    correo: str = Field(max_length=120)
    clave: str = Field(max_length=200)


class DocenteOut(BaseModel):
    correo: str


@router.post("/login", response_model=DocenteOut, responses={401: {"model": ErrorOut}, 429: {"model": ErrorOut}})
def iniciar_sesion(datos: LoginIn, respuesta: Response, auth: AutenticarDocente = Depends(obtener_autenticador)) -> DocenteOut:
    try:
        docente, token = auth.iniciar_sesion(datos.correo, datos.clave)
    except CredencialesInvalidas as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except DemasiadosIntentos as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    respuesta.set_cookie(COOKIE, token, max_age=int(DURACION_SESION.total_seconds()), httponly=True, samesite="strict", path="/")
    return DocenteOut(correo=docente.correo)


@router.post("/logout", status_code=204)
def cerrar_sesion(
    respuesta: Response,
    token: str | None = Cookie(None, alias=COOKIE),
    auth: AutenticarDocente = Depends(obtener_autenticador),
) -> None:
    auth.cerrar_sesion(token)
    respuesta.delete_cookie(COOKIE, path="/")


@router.get("/sesion", response_model=DocenteOut, responses={401: {"model": ErrorOut}})
def sesion_actual(docente: Docente = Depends(exigir_docente)) -> DocenteOut:
    return DocenteOut(correo=docente.correo)
