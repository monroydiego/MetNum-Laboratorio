from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from app.domain.funciones import ErrorMetodo
from app.infrastructure.database import UPLOADS_DIR, preparar_bd
from app.infrastructure.dataseeding import sembrar_datos
from app.presentation import routes_auth, routes_calculo, routes_docente, routes_records

(UPLOADS_DIR / "evidencias").mkdir(parents=True, exist_ok=True)
preparar_bd()
sembrar_datos()  # garantiza la cuenta de docente en cada arranque

app = FastAPI(title="Motor Numérico & Auditoría Docente")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ErrorMetodo)
async def _error_metodo(_: Request, exc: ErrorMetodo) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": str(exc)})


app.include_router(routes_calculo.router)
app.include_router(routes_calculo.catalogo)
app.include_router(routes_calculo.problemas)
app.include_router(routes_auth.router)
app.include_router(routes_records.router)
app.include_router(routes_docente.router)
app.include_router(routes_docente.matriculas)


@app.get("/uploads/evidencias/{nombre}", dependencies=[Depends(routes_auth.exigir_docente)])
def foto_evidencia(nombre: str) -> FileResponse:
    """Las fotos de los alumnos solo se sirven con sesión de docente (nombres uuid, sin rutas)."""
    ruta = (UPLOADS_DIR / "evidencias" / nombre).resolve()
    if ruta.parent != (UPLOADS_DIR / "evidencias").resolve() or not ruta.is_file():
        raise HTTPException(status_code=404, detail="Foto no encontrada.")
    return FileResponse(ruta)


@app.get("/api/salud")
def salud() -> dict[str, str]:
    return {"estado": "ok"}
