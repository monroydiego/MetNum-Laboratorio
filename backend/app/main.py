from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.domain.funciones import ErrorMetodo
from app.infrastructure.database import UPLOADS_DIR, preparar_bd
from app.presentation import routes_calculo, routes_docente

(UPLOADS_DIR / "evidencias").mkdir(parents=True, exist_ok=True)
preparar_bd()

app = FastAPI(title="Motor Numérico & Auditoría Docente")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ErrorMetodo)
async def _error_metodo(_: Request, exc: ErrorMetodo) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": str(exc)})


app.include_router(routes_calculo.router)
app.include_router(routes_calculo.catalogo)
app.include_router(routes_docente.router)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


@app.get("/api/salud")
def salud() -> dict[str, str]:
    return {"estado": "ok"}
