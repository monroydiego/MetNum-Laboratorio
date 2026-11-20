"""Punto de entrada del motor para la versión de escritorio (.exe).

Sirve en un MISMO origen (http://127.0.0.1:<puerto>) la API de FastAPI (`backend/app`) y el
build estático del frontend (`frontend/dist`). Así el juego usa sus rutas relativas `/api` y
`/uploads` y la cookie de sesión docente (SameSite=Strict) sin proxy ni CORS.

No modifica `backend/`: importa la app tal cual y solo monta los archivos estáticos al final,
de modo que las rutas de la API siempre tienen prioridad.

Uso:  servidor_escritorio.py --puerto 48650 [--web <carpeta dist>]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

CONGELADO = getattr(sys, "frozen", False)  # True dentro del ejecutable de PyInstaller
RAIZ_PROYECTO = Path(__file__).resolve().parents[2]

if not CONGELADO:
    # En desarrollo, `app` vive en backend/.
    sys.path.insert(0, str(RAIZ_PROYECTO / "backend"))


def _carpeta_web_por_defecto() -> Path:
    if CONGELADO:
        return Path(sys._MEIPASS) / "web"  # type: ignore[attr-defined]
    return RAIZ_PROYECTO / "frontend" / "dist"


def main() -> None:
    parser = argparse.ArgumentParser(description="Motor numérico + juego (escritorio)")
    parser.add_argument("--puerto", type=int, default=48650)
    parser.add_argument("--web", type=Path, default=_carpeta_web_por_defecto())
    args = parser.parse_args()

    web: Path = args.web.resolve()
    if not (web / "index.html").is_file():
        sys.exit(f"No se encontró el build del frontend en {web} (ejecuta npm run build:front).")

    import uvicorn
    from fastapi.staticfiles import StaticFiles

    from app.main import app

    app.mount("/", StaticFiles(directory=web, html=True), name="juego")

    uvicorn.run(app, host="127.0.0.1", port=args.puerto, log_level="warning", access_log=False)


if __name__ == "__main__":
    main()
